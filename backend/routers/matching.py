"""
Matching game.

GET  /modules/{module_id}/matching
POST /modules/{module_id}/matching/regenerate

Returns 8 short term/definition pairs the player has to match.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from knowledge import ModuleKnowledge
from routers._gen import cached_or_generate, bust_cache, extract_json

router = APIRouter()


class MatchPair(BaseModel):
    id: str
    term: str          # short, ≤4 words
    definition: str    # one concise sentence


class MatchingResponse(BaseModel):
    module_id: str
    module_name: str
    pairs: list[MatchPair]


def _prompt(module: ModuleKnowledge) -> str:
    count = 8
    return f"""Design a memory/matching mini-game for the role below.

{module.as_prompt_context()}

---

Generate EXACTLY {count} term ↔ definition pairs. Mix sources:
- The role's glossary terms (use as-is when they're already great)
- Key procedures distilled to a 4-word "name" + one-sentence summary
- Important rules distilled to a 3-word "name" + the rule restated

Each pair must follow these constraints:
- "term": 1-4 words MAX. Memorable, distinct, suitable for a card label.
- "definition": ONE clean sentence (≤ 20 words). No "the term refers to" filler.
- Across the {count} pairs, the terms must all sound clearly different from one
  another (the player will need to tell them apart at a glance).

Return ONLY a JSON array, no markdown. Schema:
[
  {{"id": "{module.id}-m1", "term": "Short Term", "definition": "One concise sentence."}},
  ...
]

IDs: {module.id}-m1, {module.id}-m2, ...
"""


def _parse(module: ModuleKnowledge, raw: str) -> MatchingResponse:
    data = extract_json(raw)
    if not isinstance(data, list):
        raise ValueError("Expected JSON array at top level")
    pairs = [MatchPair(**item) for item in data]
    return MatchingResponse(
        module_id=module.id,
        module_name=module.name,
        pairs=pairs,
    )


@router.get("/modules/{module_id}/matching", response_model=MatchingResponse)
async def get_matching(module_id: str):
    return cached_or_generate(module_id, "matching", _prompt, _parse)


@router.post("/modules/{module_id}/matching/regenerate", response_model=MatchingResponse)
async def regenerate_matching(module_id: str):
    bust_cache(module_id, "matching")
    return cached_or_generate(module_id, "matching", _prompt, _parse)
