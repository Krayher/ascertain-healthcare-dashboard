from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.note import NoteCreate, NoteRead
from app.services import notes as svc
from app.services.patients import PatientNotFound

router = APIRouter(prefix="/patients/{patient_id}/notes", tags=["notes"])


@router.get("", response_model=list[NoteRead])
def list_notes(
    patient_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]
) -> list[NoteRead]:
    try:
        return [NoteRead.model_validate(n) for n in svc.list_notes(db, patient_id)]
    except PatientNotFound as exc:
        raise HTTPException(status_code=404, detail="Patient not found") from exc


@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
def create_note(
    patient_id: uuid.UUID,
    payload: NoteCreate,
    db: Annotated[Session, Depends(get_db)],
) -> NoteRead:
    try:
        return NoteRead.model_validate(svc.create_note(db, patient_id, payload))
    except PatientNotFound as exc:
        raise HTTPException(status_code=404, detail="Patient not found") from exc


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    patient_id: uuid.UUID,
    note_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    try:
        svc.delete_note(db, patient_id, note_id)
    except svc.NoteNotFound as exc:
        raise HTTPException(status_code=404, detail="Note not found") from exc
    except PatientNotFound as exc:
        raise HTTPException(status_code=404, detail="Patient not found") from exc
