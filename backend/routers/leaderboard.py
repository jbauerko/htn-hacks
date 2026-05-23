import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, LeaderboardEntry, ModuleCompletion, Volunteer

COMPLETION_MIN_ACCURACY: float = float(os.getenv("COMPLETION_MIN_ACCURACY", "0.70"))
logger = logging.getLogger(__name__)
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


# ---------------------------------------------------------------------------
# Completion tracking (called after every score submit)
# ---------------------------------------------------------------------------

def _try_record_completion(
    db: Session,
    player_name: str,
    module_id: str,
    score: int,
    accuracy: float,
) -> None:
    """
    Case-insensitive name lookup against the volunteers table.
    If matched and accuracy >= threshold, upsert a module_completions row
    (keeping the best attempt). Silently swallows all exceptions so a bug
    here can never break the score submit path.
    """
    try:
        if accuracy < COMPLETION_MIN_ACCURACY:
            return

        volunteer = (
            db.query(Volunteer)
              .filter(Volunteer.name.ilike(player_name.strip()))
              .first()
        )
        if volunteer is None:
            return

        existing = (
            db.query(ModuleCompletion)
              .filter(
                  ModuleCompletion.volunteer_id == volunteer.id,
                  ModuleCompletion.module_id == module_id,
              )
              .first()
        )

        if existing is None:
            db.add(ModuleCompletion(
                volunteer_id=volunteer.id,
                module_id=module_id,
                best_score=score,
                best_accuracy=accuracy,
                completed_at=datetime.now(timezone.utc),
            ))
            db.commit()
            logger.info(
                "Recorded completion: volunteer=%d module=%s accuracy=%.2f",
                volunteer.id, module_id, accuracy,
            )
        elif accuracy > existing.best_accuracy or score > existing.best_score:
            existing.best_accuracy = max(accuracy, existing.best_accuracy)
            existing.best_score = max(score, existing.best_score)
            existing.completed_at = datetime.now(timezone.utc)
            db.commit()
            logger.info(
                "Updated completion: volunteer=%d module=%s new_accuracy=%.2f",
                volunteer.id, module_id, accuracy,
            )
    except Exception:
        logger.exception(
            "Non-fatal: failed to record completion for player=%s module=%s",
            player_name, module_id,
        )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

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

    # Attempt to record completion — never raises
    _try_record_completion(db, entry.player_name, entry.module_id, entry.score, entry.accuracy)

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
