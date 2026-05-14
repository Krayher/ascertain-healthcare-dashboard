import re
import uuid
from datetime import date, datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator

PHONE_RE = re.compile(r"^\+?[0-9 .()\-]{7,20}$")


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
    first_name: Annotated[str, Field(min_length=1, max_length=80)]
    last_name: Annotated[str, Field(min_length=1, max_length=80)]
    date_of_birth: date
    phone: Annotated[str, Field(min_length=7, max_length=20)]
    email: EmailStr | None = None
    address: Annotated[str | None, Field(default=None, max_length=240)] = None
    blood_type: BloodType
    status: PatientStatus = PatientStatus.active
    conditions: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)

    @field_validator("phone")
    @classmethod
    def _phone_shape(cls, v: str) -> str:
        if not PHONE_RE.match(v):
            raise ValueError("Phone must look like +14155550142 or similar.")
        return v

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
    last_visit_at: datetime | None = None
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
