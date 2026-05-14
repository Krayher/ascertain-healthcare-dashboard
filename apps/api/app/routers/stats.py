from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Note, Patient

router = APIRouter(prefix="/stats", tags=["stats"])


class Stats(BaseModel):
    total_patients: int
    active_patients: int
    follow_up_patients: int
    notes_this_week: int


class RecentNote(BaseModel):
    id: UUID
    patient_id: UUID
    patient_name: str
    content: str
    author: str
    created_at: datetime


class Dashboard(BaseModel):
    stats: Stats
    recent_notes: list[RecentNote]
    activity: list[int]  # last 14 days, oldest first


@router.get("/dashboard", response_model=Dashboard)
def dashboard(db: Annotated[Session, Depends(get_db)]) -> Dashboard:
    total = db.scalar(select(func.count()).select_from(Patient)) or 0
    active = (
        db.scalar(
            select(func.count()).select_from(Patient).where(Patient.status == "active")
        )
        or 0
    )
    follow_up = (
        db.scalar(
            select(func.count())
            .select_from(Patient)
            .where(Patient.status == "follow_up")
        )
        or 0
    )

    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    notes_this_week = (
        db.scalar(
            select(func.count()).select_from(Note).where(Note.created_at >= week_ago)
        )
        or 0
    )

    recent_rows = (
        db.query(Note, Patient)
        .join(Patient, Note.patient_id == Patient.id)
        .order_by(Note.created_at.desc())
        .limit(10)
        .all()
    )

    recent_notes = [
        RecentNote(
            id=note.id,
            patient_id=patient.id,
            patient_name=f"{patient.first_name} {patient.last_name}",
            content=note.content,
            author=note.author,
            created_at=note.created_at,
        )
        for note, patient in recent_rows
    ]

    # Activity: notes created per day for the last 14 days (oldest first).
    activity: list[int] = []
    for offset in range(13, -1, -1):
        day_start = (now - timedelta(days=offset)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        day_end = day_start + timedelta(days=1)
        count = (
            db.scalar(
                select(func.count())
                .select_from(Note)
                .where(Note.created_at >= day_start, Note.created_at < day_end)
            )
            or 0
        )
        activity.append(count)

    return Dashboard(
        stats=Stats(
            total_patients=total,
            active_patients=active,
            follow_up_patients=follow_up,
            notes_this_week=notes_this_week,
        ),
        recent_notes=recent_notes,
        activity=activity,
    )
