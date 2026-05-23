"""
POST /modules/{module_id}/scenarios

Generates interactive training scenarios from a module's YAML knowledge base
using Claude. Scenarios are cached in memory per module so we only call the
API once per server lifetime (or until /reload is hit).
"""

import json
import logging
from functools import lru_cache

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from knowledge import get_module, ModuleKnowledge

logger = logging.getLogger(__name__)
router = APIRouter()
client = anthropic.Anthropic()

# ---------------------------------------------------------------------------
# Output schemas (what Claude returns, what we send to the frontend)
# ---------------------------------------------------------------------------

class Choice(BaseModel):
    id: str            # "a", "b", "c", "d"
    text: str
    outcome: str       # shown after the player picks this option
    points: int        # positive = good, negative = bad
    is_correct: bool   # true for the single best answer


class Scenario(BaseModel):
    id: str
    title: str
    situation: str
    hint: str | None = None
    choices: list[Choice]


class ScenariosResponse(BaseModel):
    module_id: str
    module_name: str
    scenarios: list[Scenario]


# ---------------------------------------------------------------------------
# Scenario generation cache (keyed by module_id)
# ---------------------------------------------------------------------------

_scenario_cache: dict[str, ScenariosResponse] = {}


def _build_generation_prompt(module: ModuleKnowledge, count: int) -> str:
    return f"""You are designing an interactive training game for event volunteers.
Your task is to generate {count} realistic scenario-based exercises for the role described below.

{module.as_prompt_context()}

---

Generate exactly {count} scenarios. Each scenario should:
- Present a realistic situation a volunteer in this role might actually face
- Have 3-4 choices representing plausible responses (not obviously absurd options)
- Have exactly ONE choice marked as correct (the best practice response)
- Award points: best answer +15 to +25, acceptable answers 0 to +10, poor answers -5 to -15
- Include a brief outcome explanation for EVERY choice (1-2 sentences, shown after the player picks it)
- Cover different aspects of the role — don't repeat similar situations
- Be engaging and slightly dramatic to make the game fun

Return ONLY a valid JSON array (no markdown, no explanation) in this exact structure:
[
  {{
    "id": "{module.id}-001",
    "title": "Short Scenario Title",
    "situation": "2-4 sentence description of what is happening right now. Write in present tense, second person ('You are...'). Be specific and vivid.",
    "hint": "Optional one-sentence nudge toward the right answer, or null",
    "choices": [
      {{
        "id": "a",
        "text": "What the volunteer does (short, action-oriented)",
        "outcome": "What happens as a result. Be specific about consequences.",
        "points": 20,
        "is_correct": true
      }},
      {{
        "id": "b",
        "text": "...",
        "outcome": "...",
        "points": -10,
        "is_correct": false
      }}
    ]
  }}
]

Scenario IDs should be {module.id}-001, {module.id}-002, etc.
"""


def _parse_scenarios(module_id: str, raw: str) -> list[Scenario]:
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Claude returned invalid JSON: {exc}\n\nRaw output:\n{raw[:500]}") from exc

    scenarios = []
    for item in data:
        choices = [Choice(**c) for c in item["choices"]]
        scenarios.append(Scenario(
            id=item["id"],
            title=item["title"],
            situation=item["situation"],
            hint=item.get("hint"),
            choices=choices,
        ))
    return scenarios


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/modules/{module_id}/scenarios", response_model=ScenariosResponse)
async def generate_scenarios(module_id: str, count: int = 6):
    """
    Return generated training scenarios for a module.
    Results are cached after the first call — restart the server or hit
    DELETE /modules/{module_id}/scenarios/cache to regenerate.
    """
    if count < 1 or count > 15:
        raise HTTPException(status_code=400, detail="count must be between 1 and 15")

    # Return cached result if available
    if module_id in _scenario_cache:
        cached = _scenario_cache[module_id]
        logger.info("Returning cached scenarios for module '%s'", module_id)
        return cached

    module = get_module(module_id)
    if module is None:
        raise HTTPException(status_code=404, detail=f"Module '{module_id}' not found")

    logger.info("Generating %d scenarios for module '%s' via Claude...", count, module_id)

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=(
                "You are an expert instructional designer creating gamified training content. "
                "Always respond with valid JSON only — no markdown fences, no commentary."
            ),
            messages=[
                {"role": "user", "content": _build_generation_prompt(module, count)}
            ],
        )
        raw = message.content[0].text
    except anthropic.APIError as exc:
        logger.error("Anthropic API error: %s", exc)
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}") from exc

    try:
        scenarios = _parse_scenarios(module_id, raw)
    except ValueError as exc:
        logger.error("Failed to parse scenarios: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    result = ScenariosResponse(
        module_id=module_id,
        module_name=module.name,
        scenarios=scenarios,
    )
    _scenario_cache[module_id] = result
    logger.info("Cached %d scenarios for module '%s'", len(scenarios), module_id)
    return result


@router.delete("/modules/{module_id}/scenarios/cache", status_code=204)
async def bust_scenario_cache(module_id: str):
    """Force regeneration next time scenarios are requested for this module."""
    _scenario_cache.pop(module_id, None)
    return None
