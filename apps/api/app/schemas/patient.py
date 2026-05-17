import re
import uuid
from datetime import date, datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator

# Contact must contain at least one phone- or email-shaped token. The seed
# data uses both, sometimes joined with " | ", so we accept either alone or
# combined — but reject prose with no contactable identifier.
_PHONE_RE = re.compile(r"\+?\d[\d\s().\-]{6,}")
_EMAIL_RE = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+")

MAX_CONDITIONS_OR_ALLERGIES = 50
MAX_CONDITION_OR_ALLERGY_LEN = 80


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

    @field_validator("contact")
    @classmethod
    def _contact_has_phone_or_email(cls, v: str) -> str:
        if not (_PHONE_RE.search(v) or _EMAIL_RE.search(v)):
            raise ValueError(
                "Contact must include a phone number or email address."
            )
        return v.strip()

    @field_validator("conditions", "allergies")
    @classmethod
    def _validate_list(cls, v: list[str]) -> list[str]:
        if len(v) > MAX_CONDITIONS_OR_ALLERGIES:
            raise ValueError(
                f"At most {MAX_CONDITIONS_OR_ALLERGIES} entries allowed."
            )
        cleaned: list[str] = []
        for item in v:
            stripped = item.strip()
            if not stripped:
                raise ValueError("Entries must not be empty.")
            if len(stripped) > MAX_CONDITION_OR_ALLERGY_LEN:
                raise ValueError(
                    f"Each entry must be at most "
                    f"{MAX_CONDITION_OR_ALLERGY_LEN} characters."
                )
            cleaned.append(stripped)
        return cleaned


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
