"""
Spot-the-violation game.

GET  /modules/{module_id}/violations
POST /modules/{module_id}/violations/regenerate

Generates a small set of short "shift stories". Each story is split into
sentence-sized spans. Some spans describe the volunteer breaking a rule;
the player taps every such span to score.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from knowledge import ModuleKnowledge
from routers._gen import cached_or_generate, bust_cache, extract_json

router = APIRouter()


class StorySpan(BaseModel):
    id: str
    text: str
    is_violation: bool
    violated_rule: str | None = None  # quote / paraphrase of the rule


class Story(BaseModel):
    id: str
    title: str
    intro: str          # 1-sentence framing ("It's Saturday afternoon at the desk...")
    spans: list[StorySpan]


class ViolationsResponse(BaseModel):
    module_id: str
    module_name: str
    stories: list[Story]


def _prompt(module: ModuleKnowledge) -> str:
    story_count = 4
    return f"""Design a SPOT-THE-VIOLATION mini-game for the role below.

{module.as_prompt_context()}

---

Generate EXACTLY {story_count} short "shift stories". Each story is a
sequence of 6-8 sentence-sized "spans" describing what a volunteer does
during a few minutes of their shift. SOME spans describe the volunteer
breaking one of the role's non-negotiable rules. The player will tap every
violating span to score points.

Per story:
- title: 3-6 word, evocative ("Saturday afternoon rush", "The forgotten ticket")
- intro: ONE sentence of scene-setting (NOT one of the tappable spans)
- spans: 6-8 spans, of which 2-4 are violations (mix it up across stories;
  not the same count every time)
- Each span is ONE sentence (max ~25 words), past tense, third person
  ("You walked over to the line and...").
  Wait — actually use SECOND PERSON ("You walked over...") so it feels
  immersive. Past tense is fine.
- Violation spans must clearly break a specific rule from the role's rule
  list. Set "violated_rule" to a short paraphrase of WHICH rule is broken.
- Non-violation spans are normal correct behaviour; set "violated_rule": null.
- Mix violations among non-violations so the player has to read carefully.
- Across all stories, hit a variety of different rules — don't keep using
  the same one.

Return ONLY a JSON array, no markdown. Schema:
[
  {{
    "id": "{module.id}-v1",
    "title": "Saturday Afternoon Rush",
    "intro": "It's 2pm and the line is wrapped around the lobby.",
    "spans": [
      {{"id":"s1","text":"You greeted the next participant by name.","is_violation":false,"violated_rule":null}},
      {{"id":"s2","text":"They forgot their ticket so you handed them a wristband anyway.","is_violation":true,"violated_rule":"Never issue a wristband without a verified match."}}
    ]
  }}
]

IDs: stories {module.id}-v1, {module.id}-v2, ...; spans s1, s2, ... within each story.
"""


def _parse(module: ModuleKnowledge, raw: str) -> ViolationsResponse:
    data = extract_json(raw)
    if not isinstance(data, list):
        raise ValueError("Expected JSON array at top level")
    stories: list[Story] = []
    for item in data:
        spans = [StorySpan(**s) for s in item["spans"]]
        if not any(s.is_violation for s in spans):
            raise ValueError(f"Story {item.get('id')} has no violation spans")
        stories.append(Story(
            id=item["id"],
            title=item["title"],
            intro=item["intro"],
            spans=spans,
        ))
    return ViolationsResponse(
        module_id=module.id,
        module_name=module.name,
        stories=stories,
    )


@router.get("/modules/{module_id}/violations", response_model=ViolationsResponse)
async def get_violations(module_id: str):
    return cached_or_generate(module_id, "violations", _prompt, _parse)


@router.post("/modules/{module_id}/violations/regenerate", response_model=ViolationsResponse)
async def regenerate_violations(module_id: str):
    bust_cache(module_id, "violations")
    return cached_or_generate(module_id, "violations", _prompt, _parse)
