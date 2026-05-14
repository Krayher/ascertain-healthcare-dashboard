from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.notes import list_notes
from app.services.patients import PatientNotFound, get_patient
from app.services.summarizer import Summarizer, build_summarizer

router = APIRouter(prefix="/patients/{patient_id}/summary", tags=["summary"])


def get_summarizer() -> Summarizer:
    return build_summarizer()


class SummaryResponse(BaseModel):
    summary: str
    source: str
    note_count: int


@router.get("", response_model=SummaryResponse)
def get_summary(
    patient_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    summarizer: Annotated[Summarizer, Depends(get_summarizer)],
) -> SummaryResponse:
    try:
        patient = get_patient(db, patient_id)
    except PatientNotFound as exc:
        raise HTTPException(status_code=404, detail="Patient not found") from exc
    notes = list_notes(db, patient_id)
    result = summarizer.summarize(patient, notes)
    return SummaryResponse(
        summary=result.summary, source=result.source, note_count=result.note_count
    )
