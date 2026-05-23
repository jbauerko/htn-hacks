from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class Choice(BaseModel):
    id: str
    text: str
    outcome: str          # explanation shown after picking
    points: int           # can be negative
    is_correct: bool      # whether this is the best answer


class Scenario(BaseModel):
    id: str
    title: str
    situation: str        # the situation description
    choices: list[Choice]
    hint: Optional[str] = None


class Module(BaseModel):
    id: str
    name: str
    description: str
    icon: str             # emoji
    color: str            # tailwind color class base (e.g. "indigo")
    scenarios: list[Scenario]


class ModuleSummary(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    color: str
    scenario_count: int


# Leaderboard schemas
class ScoreSubmit(BaseModel):
    player_name: str
    module_id: str
    score: int
    scenarios_completed: int
    correct_answers: int


class LeaderboardEntryOut(BaseModel):
    id: int
    player_name: str
    module_id: str
    score: int
    scenarios_completed: int
    accuracy: float
    created_at: datetime

    model_config = {"from_attributes": True}


# AI feedback schema
class FeedbackRequest(BaseModel):
    module_id: str
    scenario_title: str
    situation: str
    chosen_text: str
    is_correct: bool
    outcome: str
