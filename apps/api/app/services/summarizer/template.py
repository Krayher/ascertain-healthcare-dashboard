from __future__ import annotations

from datetime import date

from app.models import Note, Patient
from app.services.summarizer.base import SummaryResult, Summarizer


def _age(dob: date) -> int:
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


class TemplateSummarizer(Summarizer):
    def summarize(self, patient: Patient, notes: list[Note]) -> SummaryResult:
        age = _age(patient.date_of_birth)
        conditions = (
            ", ".join(patient.conditions) if patient.conditions else "none recorded"
        )
        allergies = (
            ", ".join(patient.allergies) if patient.allergies else "none recorded"
        )
        n = len(notes)
        if notes:
            latest = max(notes, key=lambda x: x.timestamp)
            recent = (
                f"{n} clinical note{'s' if n != 1 else ''} on record; the most recent "
                f"({latest.timestamp:%b %d, %Y}) reads: \"{latest.content[:180]}\""
            )
        else:
            recent = "No clinical notes on record yet."

        summary = (
            f"{patient.name} is a {age}-year-old, "
            f"blood type {patient.blood_type}. Status: {patient.status}. "
            f"Active conditions: {conditions}. Allergies: {allergies}. {recent}"
        )
        return SummaryResult(summary=summary, source="template", note_count=n)
