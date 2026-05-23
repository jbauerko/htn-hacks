"""
Radio dispatch game.

GET  /modules/{module_id}/radio
POST /modules/{module_id}/radio/regenerate

Generates a stream of incoming walkie-talkie / dispatch messages. The player
sees each message for a short time window and must tap the correct response
action before the timer runs out. Arcade pacing.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from knowledge import ModuleKnowledge
from routers._gen import cached_or_generate, bust_cache, extract_json

router = APIRouter()


class RadioChoice(BaseModel):
    id: str
    text: str          # short imperative ("Send medical", "Confirm and wait")
    is_correct: bool
    feedback: str      # 1-line outcome shown after the player picks


class Transmission(BaseModel):
    id: str
    callsign: str            # who is "calling in" (e.g. "Marshal 3", "Front Desk")
    message: str             # the radio message body itself, in radio-speak
    time_limit_seconds: int  # 5..10
    choices: list[RadioChoice]


class RadioResponse(BaseModel):
    module_id: str
    module_name: str
    transmissions: list[Transmission]


def _prompt(module: ModuleKnowledge) -> str:
    count = 8
    return f"""Design an arcade-style RADIO DISPATCH mini-game for the role below.

{module.as_prompt_context()}

---

Imagine the player is wearing a headset. Incoming "transmissions" appear
one at a time. Each has a short window (5-10s) for the player to tap one of
3-4 quick-action responses. Wrong answer or timeout = miss.

Generate EXACTLY {count} transmissions for this role.

Rules:
- "callsign": who is on the radio. Use believable handles for this role
  (e.g. "Marshal 3", "Front Desk", "Lead", "Kitchen", "Sponsor Booth").
- "message": 1-2 short sentences in radio-speak. Use proper radio etiquette
  when appropriate ("over", "copy", "stand by") — but don't overdo it.
- "time_limit_seconds": between 5 and 10. Harder/longer messages get more time.
- "choices": 3 or 4 short imperative actions (2-5 words each). EXACTLY ONE is
  correct. Wrong choices should be plausibly tempting, not obviously bad.
- "feedback": one sentence shown after the player picks, explaining what
  happens next.

Vary the message types: routine status check-ins, an actual incident, a
question from another volunteer, a coordination request, an escalation.

Return ONLY a JSON array, no markdown. Schema:
[
  {{
    "id": "{module.id}-r1",
    "callsign": "Marshal 3",
    "message": "Marshal 3 to Lead. Crowd at main stage looks heavy, over.",
    "time_limit_seconds": 7,
    "choices": [
      {{"id":"a","text":"Acknowledge and start redirecting","is_correct":true,"feedback":"You begin moving newcomers to side hall. Lead thanks you."}},
      {{"id":"b","text":"Tell them to keep watching","is_correct":false,"feedback":"Crowd hits critical density before you act. Lead is annoyed."}}
    ]
  }}
]

IDs: {module.id}-r1, {module.id}-r2, ...
"""


def _parse(module: ModuleKnowledge, raw: str) -> RadioResponse:
    data = extract_json(raw)
    if not isinstance(data, list):
        raise ValueError("Expected JSON array at top level")
    transmissions: list[Transmission] = []
    for item in data:
        choices = [RadioChoice(**c) for c in item["choices"]]
        if sum(1 for c in choices if c.is_correct) != 1:
            raise ValueError(f"Transmission {item.get('id')} must have exactly one correct choice")
        transmissions.append(Transmission(
            id=item["id"],
            callsign=item["callsign"],
            message=item["message"],
            time_limit_seconds=max(5, min(10, int(item["time_limit_seconds"]))),
            choices=choices,
        ))
    return RadioResponse(
        module_id=module.id,
        module_name=module.name,
        transmissions=transmissions,
    )


@router.get("/modules/{module_id}/radio", response_model=RadioResponse)
async def get_radio(module_id: str):
    return cached_or_generate(module_id, "radio", _prompt, _parse)


@router.post("/modules/{module_id}/radio/regenerate", response_model=RadioResponse)
async def regenerate_radio(module_id: str):
    bust_cache(module_id, "radio")
    return cached_or_generate(module_id, "radio", _prompt, _parse)
