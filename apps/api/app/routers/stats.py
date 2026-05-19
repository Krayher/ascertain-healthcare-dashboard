from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_async_db
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
    # Clinical event time the frontend renders. Matches Note.timestamp.
    timestamp: datetime


class Dashboard(BaseModel):
    stats: Stats
    recent_notes: list[RecentNote]
    activity: list[int]  # last 14 days, oldest first


@router.get("/dashboard", response_model=Dashboard)
async def dashboard(db: Annotated[AsyncSession, Depends(get_async_db)]) -> Dashboard:
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    window_start = (now - timedelta(days=13)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    window_end = window_start + timedelta(days=14)

    # Aggregate patient counts in one query: total + active + follow_up + inactive.
    patient_stats_q = select(
        func.count().label("total"),
        func.count(case((Patient.status == "active", 1))).label("active"),
        func.count(case((Patient.status == "follow_up", 1))).label("follow_up"),
        func.count(case((Patient.status == "inactive", 1))).label("inactive"),
    )
    patient_stats = (await db.execute(patient_stats_q)).one()

    notes_week_q = (
        select(func.count()).select_from(Note).where(Note.timestamp >= week_ago)
    )
    notes_this_week = (await db.scalar(notes_week_q)) or 0

    # Recent notes joined with patient — single query, newest-first by event time.
    recent_q = (
        select(Note, Patient)
        .join(Patient, Note.patient_id == Patient.id)
        .order_by(Note.timestamp.desc())
        .limit(10)
    )
    recent_rows = (await db.execute(recent_q)).all()

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

    # 14-day activity: one GROUP BY query instead of 14 round trips.
    # Bucket by clinical event time (Note.timestamp), not row insertion time.
    day_bucket = func.date_trunc("day", Note.timestamp)
    activity_q = (
        select(day_bucket.label("day"), func.count().label("n"))
        .where(Note.timestamp >= window_start, Note.timestamp < window_end)
        .group_by(day_bucket)
    )
    activity_rows = (await db.execute(activity_q)).all()
    counts_by_day: dict[datetime, int] = {row.day: row.n for row in activity_rows}

    activity: list[int] = []
    for offset in range(14):
        day = window_start + timedelta(days=offset)
        # Postgres returns timezone-aware datetimes; key the lookup on the
        # tz-aware datetime to match.
        activity.append(counts_by_day.get(day, 0))

    return Dashboard(
        stats=Stats(
            total_patients=int(patient_stats.total or 0),
            active_patients=int(patient_stats.active or 0),
            follow_up_patients=int(patient_stats.follow_up or 0),
            inactive_patients=int(patient_stats.inactive or 0),
            notes_this_week=int(notes_this_week),
        ),
        recent_notes=recent_notes,
        activity=activity,
    )
