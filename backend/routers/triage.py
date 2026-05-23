"""
Triage / sorting game.

GET  /modules/{module_id}/triage
POST /modules/{module_id}/triage/regenerate

Returns 3 role-appropriate "buckets" and ~10 incoming situation cards.
The player must sort each card into the correct bucket before time runs out.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from knowledge import ModuleKnowledge
from routers._gen import cached_or_generate, bust_cache, extract_json

router = APIRouter()


class Bucket(BaseModel):
    id: str           # short slug, e.g. "handle"
    label: str        # button text shown to the player
    icon: str         # single emoji
    color: str        # tailwind color hint: emerald | amber | rose | sky | violet


class TriageTicket(BaseModel):
    id: str
    text: str                  # the situation card
    correct_bucket_id: str
    explanation: str           # shown after the player drops the card


class TriageResponse(BaseModel):
    module_id: str
    module_name: str
    buckets: list[Bucket]
    tickets: list[TriageTicket]


def _prompt(module: ModuleKnowledge) -> str:
    ticket_count = 10
    return f"""Design a fast-paced TRIAGE mini-game for the role below.

{module.as_prompt_context()}

---

STEP 1 — Pick EXACTLY 3 buckets the player will sort situations into.
The buckets should be the 3 most fundamental response categories a volunteer
in THIS role uses every shift. Examples for different roles:
- Registration: ["Check them in", "Send to help station", "Escalate to supervisor"]
- Safety: ["Handle yourself", "Radio medical", "Call security"]
- F&B: ["Serve as normal", "Refer to allergen binder", "Refuse politely"]
Pick whichever 3 make sense for this specific role. Each bucket needs:
- id: short snake_case slug
- label: 2-4 word imperative ("Handle yourself", "Escalate to lead", ...)
- icon: single emoji
- color: one of "emerald", "amber", "rose", "sky", "violet" (no duplicates)

STEP 2 — Generate EXACTLY {ticket_count} situation tickets.
- Each ticket is a SHORT (1-2 sentence) realistic situation card.
- Each ticket maps to EXACTLY ONE correct bucket.
- Distribute tickets roughly evenly across the 3 buckets (3-4 each).
- Include 2-3 "tricky" tickets that LOOK like one bucket but are actually
  another — these make the game interesting.
- explanation: 1 sentence explaining WHY this bucket is correct.

Return ONLY a JSON object, no markdown. Schema:
{{
  "buckets": [
    {{"id":"handle","label":"Handle yourself","icon":"✅","color":"emerald"}},
    {{"id":"escalate","label":"Escalate to lead","icon":"📣","color":"amber"}},
    {{"id":"refuse","label":"Refuse politely","icon":"🚫","color":"rose"}}
  ],
  "tickets": [
    {{"id":"{module.id}-t1","text":"A participant…","correct_bucket_id":"handle","explanation":"…"}},
    ...
  ]
}}

IDs: {module.id}-t1, {module.id}-t2, ...
"""


def _parse(module: ModuleKnowledge, raw: str) -> TriageResponse:
    data = extract_json(raw)
    if not isinstance(data, dict):
        raise ValueError("Expected JSON object at top level")
    buckets = [Bucket(**b) for b in data["buckets"]]
    bucket_ids = {b.id for b in buckets}
    tickets = []
    for t in data["tickets"]:
        ticket = TriageTicket(**t)
        if ticket.correct_bucket_id not in bucket_ids:
            raise ValueError(
                f"Ticket {ticket.id} references unknown bucket "
                f"'{ticket.correct_bucket_id}' (known: {bucket_ids})"
            )
        tickets.append(ticket)
    return TriageResponse(
        module_id=module.id,
        module_name=module.name,
        buckets=buckets,
        tickets=tickets,
    )


@router.get("/modules/{module_id}/triage", response_model=TriageResponse)
async def get_triage(module_id: str):
    return cached_or_generate(module_id, "triage", _prompt, _parse)


@router.post("/modules/{module_id}/triage/regenerate", response_model=TriageResponse)
async def regenerate_triage(module_id: str):
    bust_cache(module_id, "triage")
    return cached_or_generate(module_id, "triage", _prompt, _parse)
