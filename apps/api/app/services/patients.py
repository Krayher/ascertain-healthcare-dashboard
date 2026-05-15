from __future__ import annotations

import uuid
from datetime import date, timedelta
from typing import Literal

from sqlalchemy import String, asc, cast, desc, func, or_, select
from sqlalchemy.orm import Session

from app.models import Patient
from app.schemas.patient import PatientCreate, PatientUpdate

SortField = Literal["last_visit", "name", "created_at"]
SortOrder = Literal["asc", "desc"]
ALLOWED_STATUS = {"active", "follow_up", "inactive"}
ALLOWED_BLOOD = {"O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"}
ALLOWED_SORT: set[str] = {"last_visit", "name", "created_at"}
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
    blood_type: str | None = None,
    condition: str | None = None,
    age_min: int | None = None,
    age_max: int | None = None,
    sort: str = "last_visit",
    order: str = "desc",
) -> tuple[list[Patient], int]:
    if status and status not in ALLOWED_STATUS:
        raise ValueError(f"Unknown status: {status}")
    if blood_type and blood_type not in ALLOWED_BLOOD:
        raise ValueError(f"Unknown blood_type: {blood_type}")
    if sort not in ALLOWED_SORT:
        raise ValueError(f"Unknown sort field: {sort}")
    if order not in ALLOWED_ORDER:
        raise ValueError(f"Unknown order: {order}")
    if age_min is not None and age_min < 0:
        raise ValueError("age_min must be >= 0")
    if age_max is not None and age_max < 0:
        raise ValueError("age_max must be >= 0")
    if age_min is not None and age_max is not None and age_min > age_max:
        raise ValueError("age_min must be <= age_max")

    q = select(Patient)
    count_q = select(func.count()).select_from(Patient)

    def apply(stmt, where):
        return stmt.where(where)

    if status:
        q = apply(q, Patient.status == status)
        count_q = apply(count_q, Patient.status == status)

    if blood_type:
        q = apply(q, Patient.blood_type == blood_type)
        count_q = apply(count_q, Patient.blood_type == blood_type)

    if condition:
        # Match any element of the conditions array containing the substring (case-insensitive).
        cond_expr = func.lower(
            func.array_to_string(Patient.conditions, "|")
        ).like(f"%{condition.lower()}%")
        q = apply(q, cond_expr)
        count_q = apply(count_q, cond_expr)

    today = date.today()
    if age_max is not None:
        # age >= age_min means dob <= today - age_min years
        min_birth = today - timedelta(days=365 * (age_max + 1) + 1)
        q = apply(q, Patient.date_of_birth > min_birth)
        count_q = apply(count_q, Patient.date_of_birth > min_birth)
    if age_min is not None:
        max_birth = today - timedelta(days=int(365.25 * age_min))
        q = apply(q, Patient.date_of_birth <= max_birth)
        count_q = apply(count_q, Patient.date_of_birth <= max_birth)

    if search:
        like = f"%{search.lower()}%"
        condition_expr = or_(
            func.lower(Patient.name).like(like),
            func.lower(cast(Patient.id, String)).like(like),
        )
        q = apply(q, condition_expr)
        count_q = apply(count_q, condition_expr)

    direction = desc if order == "desc" else asc
    if sort == "last_visit":
        q = q.order_by(direction(Patient.last_visit).nullslast(), asc(Patient.name))
    elif sort == "name":
        q = q.order_by(direction(Patient.name))
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
