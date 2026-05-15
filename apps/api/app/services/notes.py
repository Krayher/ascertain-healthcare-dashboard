from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Note
from app.schemas.note import NoteCreate
from app.services.patients import get_patient


class NoteNotFound(Exception):
    pass


def list_notes(db: Session, patient_id: uuid.UUID) -> list[Note]:
    get_patient(db, patient_id)
    return list(
        db.query(Note)
        .filter(Note.patient_id == patient_id)
        .order_by(Note.timestamp.desc())
    )


def create_note(db: Session, patient_id: uuid.UUID, payload: NoteCreate) -> Note:
    patient = get_patient(db, patient_id)
    timestamp = payload.timestamp or datetime.now(timezone.utc)
    note = Note(
        patient_id=patient.id,
        content=payload.content,
        timestamp=timestamp,
    )
    db.add(note)
    if patient.last_visit is None or timestamp > patient.last_visit:
        patient.last_visit = timestamp
    db.commit()
    db.refresh(note)
    return note


def delete_note(db: Session, patient_id: uuid.UUID, note_id: uuid.UUID) -> None:
    get_patient(db, patient_id)
    note = (
        db.query(Note)
        .filter(Note.id == note_id, Note.patient_id == patient_id)
        .first()
    )
    if not note:
        raise NoteNotFound(str(note_id))
    db.delete(note)
    db.commit()
