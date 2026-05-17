from __future__ import annotations

from datetime import UTC, datetime, timedelta
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
    inactive_patients: int
    notes_this_week: int


class RecentNote(BaseModel):
    id: UUID
    patient_id: UUID
    patient_name: str
    content: str
    timestamp: datetime


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
    inactive = (
        db.scalar(
            select(func.count())
            .select_from(Patient)
            .where(Patient.status == "inactive")
        )
        or 0
    )

    now = datetime.now(UTC)
    week_ago = now - timedelta(days=7)
    notes_this_week = (
        db.scalar(
            select(func.count()).select_from(Note).where(Note.timestamp >= week_ago)
        )
        or 0
    )

    recent_rows = (
        db.query(Note, Patient)
        .join(Patient, Note.patient_id == Patient.id)
        .order_by(Note.timestamp.desc())
        .limit(10)
        .all()
    )

    recent_notes = [
        RecentNote(
            id=note.id,
            patient_id=patient.id,
            patient_name=patient.name,
            content=note.content,
            timestamp=note.timestamp,
        )
        for note, patient in recent_rows
    ]

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
                .where(Note.timestamp >= day_start, Note.timestamp < day_end)
            )
            or 0
        )
        activity.append(count)

    return Dashboard(
        stats=Stats(
            total_patients=total,
            active_patients=active,
            follow_up_patients=follow_up,
            inactive_patients=inactive,
            notes_this_week=notes_this_week,
        ),
        recent_notes=recent_notes,
        activity=activity,
    )
