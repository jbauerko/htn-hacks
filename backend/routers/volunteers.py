"""
Volunteer roster management.

POST /volunteers/import                           — CSV upload (admin)
GET  /volunteers                                  — list all with completion status
GET  /volunteers/{id}                             — single volunteer detail
POST /volunteers/{id}/modules/{module_id}/complete — admin override for name-mismatch cases
"""

import csv
import io
import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, ModuleCompletion, Volunteer

COMPLETION_MIN_ACCURACY: float = float(os.getenv("COMPLETION_MIN_ACCURACY", "0.70"))
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/volunteers", tags=["volunteers"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class ModuleStatus(BaseModel):
    module_id: str
    completed: bool
    best_accuracy: float | None = None
    best_score: int | None = None


class VolunteerOut(BaseModel):
    id: int
    name: str
    slack_handle: str
    assigned_modules: list[str]
    completions: list[ModuleStatus]
    created_at: datetime

    model_config = {"from_attributes": True}


class ImportResult(BaseModel):
    created: int
    updated: int
    errors: list[str]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_status(volunteer: Volunteer, db: Session) -> list[ModuleStatus]:
    completions = {
        c.module_id: c
        for c in db.query(ModuleCompletion)
                   .filter(ModuleCompletion.volunteer_id == volunteer.id)
                   .all()
    }
    return [
        ModuleStatus(
            module_id=mid,
            completed=mid in completions,
            best_accuracy=completions[mid].best_accuracy if mid in completions else None,
            best_score=completions[mid].best_score if mid in completions else None,
        )
        for mid in volunteer.assigned_modules
    ]


def _volunteer_out(v: Volunteer, db: Session) -> VolunteerOut:
    return VolunteerOut(
        id=v.id,
        name=v.name,
        slack_handle=v.slack_handle,
        assigned_modules=v.assigned_modules,
        completions=_build_status(v, db),
        created_at=v.created_at,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/import", response_model=ImportResult, status_code=200)
async def import_volunteers(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Accept a multipart CSV file with columns: name, slack_handle, modules
    - `modules` is semicolon-separated module IDs, e.g. "registration;safety-marshal"
    - Upserts by name (case-insensitive). Existing volunteers have their handle and
      module list updated; their completion records are preserved.
    """
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")  # strip UTF-8 BOM if present
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(text))
    created = updated = 0
    errors: list[str] = []

    for row_num, row in enumerate(reader, start=2):  # row 1 = header
        try:
            name = row.get("name", "").strip()
            handle = row.get("slack_handle", "").strip()
            modules_raw = row.get("modules", "").strip()

            if not name or not handle:
                errors.append(f"Row {row_num}: 'name' and 'slack_handle' are required")
                continue

            modules = [m.strip() for m in modules_raw.split(";") if m.strip()]

            # Case-insensitive upsert
            existing = (
                db.query(Volunteer)
                  .filter(Volunteer.name.ilike(name))
                  .first()
            )
            if existing:
                existing.slack_handle = handle
                existing.assigned_modules = modules
                updated += 1
                logger.info("Updated volunteer: %s", name)
            else:
                v = Volunteer(name=name, slack_handle=handle)
                v.assigned_modules = modules
                db.add(v)
                created += 1
                logger.info("Created volunteer: %s", name)

        except KeyError as exc:
            errors.append(f"Row {row_num}: missing column {exc}")

    db.commit()
    return ImportResult(created=created, updated=updated, errors=errors)


@router.get("", response_model=list[VolunteerOut])
async def list_volunteers(db: Session = Depends(get_db)):
    """List all volunteers with per-module completion status."""
    volunteers = db.query(Volunteer).order_by(Volunteer.name).all()
    return [_volunteer_out(v, db) for v in volunteers]


@router.get("/{volunteer_id}", response_model=VolunteerOut)
async def get_volunteer(volunteer_id: int, db: Session = Depends(get_db)):
    """Get a single volunteer's detail and completion status."""
    v = db.query(Volunteer).filter(Volunteer.id == volunteer_id).first()
    if v is None:
        raise HTTPException(status_code=404, detail=f"Volunteer {volunteer_id} not found")
    return _volunteer_out(v, db)


@router.post("/{volunteer_id}/modules/{module_id}/complete", status_code=200)
async def admin_mark_complete(
    volunteer_id: int,
    module_id: str,
    score: int = 100,
    accuracy: float = 1.0,
    db: Session = Depends(get_db),
):
    """
    Admin override — manually mark a module as complete for a volunteer.
    Useful when the volunteer's leaderboard name didn't match their registered name.
    """
    v = db.query(Volunteer).filter(Volunteer.id == volunteer_id).first()
    if v is None:
        raise HTTPException(status_code=404, detail=f"Volunteer {volunteer_id} not found")

    existing = (
        db.query(ModuleCompletion)
          .filter(
              ModuleCompletion.volunteer_id == volunteer_id,
              ModuleCompletion.module_id == module_id,
          )
          .first()
    )

    if existing:
        existing.best_score = max(existing.best_score, score)
        existing.best_accuracy = max(existing.best_accuracy, accuracy)
        existing.completed_at = datetime.now(timezone.utc)
        msg = "updated"
    else:
        db.add(ModuleCompletion(
            volunteer_id=volunteer_id,
            module_id=module_id,
            best_score=score,
            best_accuracy=accuracy,
        ))
        msg = "created"

    db.commit()
    logger.info("Admin marked complete: volunteer=%d module=%s (%s)", volunteer_id, module_id, msg)
    return {"status": msg, "volunteer_id": volunteer_id, "module_id": module_id}
