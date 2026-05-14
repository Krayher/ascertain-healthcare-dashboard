from __future__ import annotations

import uuid
from typing import Literal

from sqlalchemy import String, asc, cast, desc, func, or_, select
from sqlalchemy.orm import Session

from app.models import Patient
from app.schemas.patient import PatientCreate, PatientUpdate

SortField = Literal["last_visit_at", "name", "created_at"]
SortOrder = Literal["asc", "desc"]
ALLOWED_STATUS = {"active", "follow_up", "inactive"}
ALLOWED_SORT: set[str] = {"last_visit_at", "name", "created_at"}
ALLOWED_ORDER: set[str] = {"asc", "desc"}


class PatientNotFound(Exception):
    pass


def list_patients(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    status: str | None = None,
    sort: str = "last_visit_at",
    order: str = "desc",
) -> tuple[list[Patient], int]:
    if status and status not in ALLOWED_STATUS:
        raise ValueError(f"Unknown status: {status}")
    if sort not in ALLOWED_SORT:
        raise ValueError(f"Unknown sort field: {sort}")
    if order not in ALLOWED_ORDER:
        raise ValueError(f"Unknown order: {order}")

    q = select(Patient)
    count_q = select(func.count()).select_from(Patient)

    if status:
        q = q.where(Patient.status == status)
        count_q = count_q.where(Patient.status == status)

    if search:
        like = f"%{search.lower()}%"
        condition = or_(
            func.lower(Patient.first_name).like(like),
            func.lower(Patient.last_name).like(like),
            func.lower(cast(Patient.id, String)).like(like),
        )
        q = q.where(condition)
        count_q = count_q.where(condition)

    direction = desc if order == "desc" else asc
    if sort == "last_visit_at":
        q = q.order_by(direction(Patient.last_visit_at).nullslast(), asc(Patient.last_name))
    elif sort == "name":
        q = q.order_by(direction(Patient.last_name), asc(Patient.first_name))
    elif sort == "created_at":
        q = q.order_by(direction(Patient.created_at))

    total = db.scalar(count_q) or 0
    items = list(db.scalars(q.offset((page - 1) * page_size).limit(page_size)))
    return items, total


def get_patient(db: Session, patient_id: uuid.UUID) -> Patient:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise PatientNotFound(str(patient_id))
    return patient


def create_patient(db: Session, payload: PatientCreate) -> Patient:
    patient = Patient(**payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def update_patient(db: Session, patient_id: uuid.UUID, payload: PatientUpdate) -> Patient:
    patient = get_patient(db, patient_id)
    for key, value in payload.model_dump().items():
        setattr(patient, key, value)
    db.commit()
    db.refresh(patient)
    return patient


def delete_patient(db: Session, patient_id: uuid.UUID) -> None:
    patient = get_patient(db, patient_id)
    db.delete(patient)
    db.commit()
