import uuid
from datetime import date, datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator


class BloodType(str, Enum):
    O_POS = "O+"
    O_NEG = "O-"
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"


class PatientStatus(str, Enum):
    active = "active"
    follow_up = "follow_up"
    inactive = "inactive"


class PatientBase(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=160)]
    date_of_birth: date
    contact: Annotated[str, Field(min_length=1, max_length=200)]
    address: Annotated[str | None, Field(default=None, max_length=240)] = None
    blood_type: BloodType
    status: PatientStatus = PatientStatus.active
    conditions: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)

    @field_validator("date_of_birth")
    @classmethod
    def _dob_past(cls, v: date) -> date:
        if v >= date.today():
            raise ValueError("Date of birth must be in the past.")
        return v


class PatientCreate(PatientBase):
    pass


class PatientUpdate(PatientBase):
    pass


class PatientRead(PatientBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    last_visit: datetime | None = None
    created_at: datetime
    updated_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def age(self) -> int:
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def mrn(self) -> str:
        return f"MRN-{str(self.id).replace('-', '')[:5].upper()}"
