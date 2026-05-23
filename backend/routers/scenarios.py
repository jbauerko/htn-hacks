"""
Scenario branching game.

GET  /modules/{module_id}/scenarios   → returns cached scenarios for the role
POST /modules/{module_id}/scenarios/regenerate → busts the cache

Each scenario presents a realistic situation with 3-4 choices, exactly one
of which is the best practice. Choices have point values and a per-choice
outcome explanation that the UI reveals after the player picks.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from knowledge import ModuleKnowledge
from routers._gen import cached_or_generate, bust_cache, extract_json

router = APIRouter()


class Choice(BaseModel):
    id: str
    text: str
    outcome: str
    points: int
    is_correct: bool


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


def _prompt(module: ModuleKnowledge) -> str:
    count = 6
    return f"""Design {count} interactive training scenarios for the role below.

{module.as_prompt_context()}

---

Each scenario must:
- Present a realistic, specific situation a volunteer in this role would face
- Be written in present tense, second person ("You are at the desk when...")
- Offer 3-4 plausible choices (no obviously absurd options)
- Have EXACTLY ONE choice with is_correct=true (the best-practice response)
- Award points: best +15..+25, acceptable 0..+10, poor -5..-15
- Include a 1-2 sentence outcome for EVERY choice
- Cover DIFFERENT aspects of the role — no two scenarios should feel similar

Return ONLY a JSON array (no markdown). Schema:
[
  {{
    "id": "{module.id}-001",
    "title": "Short Scenario Title",
    "situation": "2-4 sentences in present tense, 2nd person, vivid and specific.",
    "hint": "Optional single-sentence nudge, or null",
    "choices": [
      {{"id":"a","text":"Action (short)","outcome":"What happens. Be specific.","points":20,"is_correct":true}},
      {{"id":"b","text":"...","outcome":"...","points":-10,"is_correct":false}}
    ]
  }}
]

IDs: {module.id}-001, {module.id}-002, ...
"""


def _parse(module: ModuleKnowledge, raw: str) -> ScenariosResponse:
    data = extract_json(raw)
    if not isinstance(data, list):
        raise ValueError("Expected a JSON array at the top level")
    scenarios = [Scenario(**item) for item in data]
    return ScenariosResponse(
        module_id=module.id,
        module_name=module.name,
        scenarios=scenarios,
    )


@router.get("/modules/{module_id}/scenarios", response_model=ScenariosResponse)
async def get_scenarios(module_id: str):
    return cached_or_generate(module_id, "scenarios", _prompt, _parse)


@router.post("/modules/{module_id}/scenarios/regenerate", response_model=ScenariosResponse)
async def regenerate_scenarios(module_id: str):
    bust_cache(module_id, "scenarios")
    return cached_or_generate(module_id, "scenarios", _prompt, _parse)
