from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.common import Page
from app.schemas.patient import PatientCreate, PatientRead, PatientUpdate
from app.services import patients as svc

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=Page[PatientRead])
def list_patients(
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    status_: str | None = Query(None, alias="status"),
    sort: str = Query("last_visit_at"),
    order: str = Query("desc"),
) -> Page[PatientRead]:
    try:
        items, total = svc.list_patients(
            db,
            page=page,
            page_size=page_size,
            search=search,
            status=status_,
            sort=sort,
            order=order,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    total_pages = (total + page_size - 1) // page_size if total else 0
    return Page[PatientRead](
        items=[PatientRead.model_validate(p) for p in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get("/{patient_id}", response_model=PatientRead)
def get_patient(
    patient_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]
) -> PatientRead:
    try:
        return PatientRead.model_validate(svc.get_patient(db, patient_id))
    except svc.PatientNotFound as exc:
        raise HTTPException(status_code=404, detail="Patient not found") from exc


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate, db: Annotated[Session, Depends(get_db)]
) -> PatientRead:
    return PatientRead.model_validate(svc.create_patient(db, payload))


@router.put("/{patient_id}", response_model=PatientRead)
def update_patient(
    patient_id: uuid.UUID,
    payload: PatientUpdate,
    db: Annotated[Session, Depends(get_db)],
) -> PatientRead:
    try:
        return PatientRead.model_validate(svc.update_patient(db, patient_id, payload))
    except svc.PatientNotFound as exc:
        raise HTTPException(status_code=404, detail="Patient not found") from exc


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(
    patient_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]
) -> None:
    try:
        svc.delete_patient(db, patient_id)
    except svc.PatientNotFound as exc:
        raise HTTPException(status_code=404, detail="Patient not found") from exc
