"""
Slack reminder endpoints.

GET  /reminders/preview  — see the reminder message without posting to Slack
POST /reminders/send     — post to the configured Slack incoming webhook
"""

import logging
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, ModuleCompletion, Volunteer
from knowledge import load_all_modules

SLACK_WEBHOOK_URL: str | None = os.getenv("SLACK_WEBHOOK_URL")
TRAINING_URL: str = os.getenv("TRAINING_URL", "http://localhost:3000")

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/reminders", tags=["reminders"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class VolunteerIncomplete(BaseModel):
    name: str
    slack_handle: str
    incomplete_modules: list[str]       # human-readable names
    incomplete_module_ids: list[str]


class ReminderPreview(BaseModel):
    total_incomplete: int
    volunteers: list[VolunteerIncomplete]
    message_text: str


class ReminderSendResult(ReminderPreview):
    posted: bool
    slack_status_code: int | None = None


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

def _build_incomplete_list(db: Session) -> list[VolunteerIncomplete]:
    """
    Returns volunteers who have at least one assigned module not yet completed.
    Completion is determined by the presence of a module_completions row
    (written only when accuracy >= COMPLETION_MIN_ACCURACY).
    """
    module_names = {m_id: m.name for m_id, m in load_all_modules().items()}

    volunteers = db.query(Volunteer).order_by(Volunteer.name).all()
    result: list[VolunteerIncomplete] = []

    for v in volunteers:
        completed_ids = {
            c.module_id
            for c in db.query(ModuleCompletion)
                       .filter(ModuleCompletion.volunteer_id == v.id)
                       .all()
        }
        incomplete_ids = [mid for mid in v.assigned_modules if mid not in completed_ids]
        if not incomplete_ids:
            continue

        result.append(VolunteerIncomplete(
            name=v.name,
            slack_handle=v.slack_handle,
            incomplete_modules=[module_names.get(mid, mid) for mid in incomplete_ids],
            incomplete_module_ids=incomplete_ids,
        ))

    return result


def _format_message(incomplete: list[VolunteerIncomplete]) -> str:
    count = len(incomplete)
    header = (
        f":mortar_board: *Training Reminder — "
        f"{count} volunteer{'s' if count != 1 else ''} "
        f"{'have' if count != 1 else 'has'} incomplete modules*"
    )

    if not incomplete:
        return f"{header}\n\nAll volunteers have completed their assigned training. :tada:"

    lines = [
        header,
        "",
        "The following volunteers still need to complete their assigned training:",
        "",
    ]
    for v in incomplete:
        modules_str = ", ".join(v.incomplete_modules)
        lines.append(f"• {v.slack_handle} — needs: {modules_str}")

    lines += [
        "",
        f"Complete your training at: {TRAINING_URL}",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/preview", response_model=ReminderPreview)
async def preview_reminder(db: Session = Depends(get_db)):
    """
    Returns the reminder data and formatted Slack message without posting.
    Use this to verify the message before sending.
    """
    incomplete = _build_incomplete_list(db)
    return ReminderPreview(
        total_incomplete=len(incomplete),
        volunteers=incomplete,
        message_text=_format_message(incomplete),
    )


@router.post("/send", response_model=ReminderSendResult)
async def send_reminder(db: Session = Depends(get_db)):
    """
    Posts the training reminder to the configured Slack channel webhook.
    Requires SLACK_WEBHOOK_URL in .env. Returns 503 if not configured.

    Trigger this from an external cron:
        0 9 * * * curl -s -X POST http://your-server/reminders/send
    """
    if not SLACK_WEBHOOK_URL:
        raise HTTPException(
            status_code=503,
            detail=(
                "SLACK_WEBHOOK_URL is not set. Add it to .env and restart the server. "
                "Get a webhook URL at: https://api.slack.com/messaging/webhooks"
            ),
        )

    incomplete = _build_incomplete_list(db)
    message_text = _format_message(incomplete)

    try:
        response = httpx.post(
            SLACK_WEBHOOK_URL,
            json={"text": message_text},
            timeout=10.0,
        )
        posted = response.status_code == 200
        if not posted:
            logger.warning(
                "Slack webhook returned %d: %s",
                response.status_code,
                response.text[:200],
            )
    except httpx.RequestError as exc:
        logger.error("Failed to reach Slack webhook: %s", exc)
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach Slack webhook: {exc}",
        ) from exc

    return ReminderSendResult(
        total_incomplete=len(incomplete),
        volunteers=incomplete,
        message_text=message_text,
        posted=posted,
        slack_status_code=response.status_code,
    )
