from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, LeaderboardEntry

router = APIRouter()


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
    rank: int | None = None

    model_config = {"from_attributes": True}


@router.post("/leaderboard", response_model=LeaderboardEntryOut, status_code=201)
async def submit_score(payload: ScoreSubmit, db: Session = Depends(get_db)):
    if payload.scenarios_completed == 0:
        raise HTTPException(status_code=400, detail="scenarios_completed must be > 0")

    accuracy = payload.correct_answers / payload.scenarios_completed

    entry = LeaderboardEntry(
        player_name=payload.player_name.strip()[:50],
        module_id=payload.module_id,
        score=payload.score,
        scenarios_completed=payload.scenarios_completed,
        accuracy=accuracy,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return LeaderboardEntryOut(
        id=entry.id,
        player_name=entry.player_name,
        module_id=entry.module_id,
        score=entry.score,
        scenarios_completed=entry.scenarios_completed,
        accuracy=entry.accuracy,
    )


@router.get("/leaderboard", response_model=list[LeaderboardEntryOut])
async def get_leaderboard(
    module_id: str | None = None,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    q = db.query(LeaderboardEntry)
    if module_id:
        q = q.filter(LeaderboardEntry.module_id == module_id)
    entries = q.order_by(LeaderboardEntry.score.desc()).limit(limit).all()

    return [
        LeaderboardEntryOut(
            id=e.id,
            player_name=e.player_name,
            module_id=e.module_id,
            score=e.score,
            scenarios_completed=e.scenarios_completed,
            accuracy=e.accuracy,
            rank=i + 1,
        )
        for i, e in enumerate(entries)
    ]
