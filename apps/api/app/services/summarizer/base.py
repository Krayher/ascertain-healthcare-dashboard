from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.models import Note, Patient


@dataclass
class SummaryResult:
    summary: str
    source: str  # "template" | "claude"
    note_count: int


class Summarizer(ABC):
    @abstractmethod
    def summarize(self, patient: Patient, notes: list[Note]) -> SummaryResult:
        ...
