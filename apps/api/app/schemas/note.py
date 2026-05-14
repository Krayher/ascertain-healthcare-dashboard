import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field


class NoteBase(BaseModel):
    content: Annotated[str, Field(min_length=1, max_length=4000)]
    author: Annotated[str, Field(min_length=1, max_length=120)]


class NoteCreate(NoteBase):
    created_at: datetime | None = None


class NoteRead(NoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime
