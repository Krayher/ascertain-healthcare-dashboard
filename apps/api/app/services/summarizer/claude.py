from __future__ import annotations

import logging

from anthropic import Anthropic, APIError, APITimeoutError

from app.models import Note, Patient
from app.services.summarizer.base import SummaryResult, Summarizer
from app.services.summarizer.template import TemplateSummarizer

log = logging.getLogger(__name__)

SYSTEM = (
    "You are a careful clinical assistant. Given a patient profile and their notes, "
    "produce a 2-4 sentence narrative summary. Use plain, professional prose. "
    "Mention identifiers (name, age, blood type), conditions, allergies, and a "
    "concise interpretation of the most recent activity. Never invent facts."
)


class ClaudeSummarizer(Summarizer):
    def __init__(self, api_key: str, fallback: TemplateSummarizer) -> None:
        self._client = Anthropic(api_key=api_key, timeout=8.0)
        self._fallback = fallback

    def summarize(self, patient: Patient, notes: list[Note]) -> SummaryResult:
        try:
            user_content = self._build_user_prompt(patient, notes)
            resp = self._client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=250,
                system=SYSTEM,
                messages=[{"role": "user", "content": user_content}],
            )
            text = "".join(b.text for b in resp.content if hasattr(b, "text"))
            return SummaryResult(
                summary=text.strip(), source="claude", note_count=len(notes)
            )
        except (APITimeoutError, APIError) as exc:
            log.warning("Claude summarizer failed (%s); falling back to template.", exc)
            return self._fallback.summarize(patient, notes)

    @staticmethod
    def _build_user_prompt(patient: Patient, notes: list[Note]) -> str:
        sorted_notes = sorted(notes, key=lambda n: n.timestamp, reverse=True)
        lines = [
            f"Patient: {patient.name}",
            f"DOB: {patient.date_of_birth.isoformat()}",
            f"Blood type: {patient.blood_type}",
            f"Status: {patient.status}",
            f"Conditions: {', '.join(patient.conditions) or 'none'}",
            f"Allergies: {', '.join(patient.allergies) or 'none'}",
            "",
            "Notes (newest first):",
        ]
        for n in sorted_notes:
            lines.append(f"- {n.timestamp:%Y-%m-%d}: {n.content}")
        return "\n".join(lines)
