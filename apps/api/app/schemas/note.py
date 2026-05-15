import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class NoteBase(BaseModel):
    content: Annotated[str, Field(min_length=1, max_length=4000)]


class NoteCreate(NoteBase):
    timestamp: datetime | None = None


class NoteRead(NoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    timestamp: datetime
    created_at: datetime
