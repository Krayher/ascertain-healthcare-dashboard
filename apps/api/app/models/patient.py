from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, Date, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

if TYPE_CHECKING:
    from app.models.note import Note


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    date_of_birth: Mapped[date] = mapped_column(Date)
    phone: Mapped[str] = mapped_column(String(40))
    email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    address: Mapped[str | None] = mapped_column(String(240), nullable=True)
    blood_type: Mapped[str] = mapped_column(String(3))
    status: Mapped[str] = mapped_column(String(16), default="active", index=True)
    conditions: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    allergies: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    last_visit_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    notes: Mapped[list[Note]] = relationship(
        back_populates="patient",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
