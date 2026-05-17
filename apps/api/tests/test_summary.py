from __future__ import annotations

from datetime import UTC, date, datetime

from app.models import Note, Patient
from app.services.summarizer.template import TemplateSummarizer


def test_template_summary_includes_basics() -> None:
    patient = Patient(
        name="Test User",
        date_of_birth=date(1980, 1, 1),
        contact="+1",
        blood_type="O+",
        status="active",
        conditions=["Hypertension"],
        allergies=["Sulfa"],
    )
    note = Note(
        content="Doing well",
        timestamp=datetime(2026, 5, 1, tzinfo=UTC),
    )

    result = TemplateSummarizer().summarize(patient, [note])
    assert "Test User" in result.summary
    assert "Hypertension" in result.summary
    assert "Sulfa" in result.summary
    assert "Doing well" in result.summary
    assert result.source == "template"
    assert result.note_count == 1


def test_template_summary_no_notes() -> None:
    patient = Patient(
        name="Empty Chart",
        date_of_birth=date(2000, 1, 1),
        contact="+1",
        blood_type="A+",
        status="active",
        conditions=[],
        allergies=[],
    )
    result = TemplateSummarizer().summarize(patient, [])
    assert "No clinical notes on record yet." in result.summary
    assert "none recorded" in result.summary
    assert result.note_count == 0


def test_summary_endpoint(client) -> None:
    pid = client.post(
        "/patients",
        json={
            "name": "Summary Test",
            "date_of_birth": "1990-01-01",
            "contact": "+14155553333",
            "blood_type": "O+",
            "status": "active",
            "conditions": ["Hypertension"],
            "allergies": [],
        },
    ).json()["id"]

    client.post(
        f"/patients/{pid}/notes",
        json={"content": "First visit; doing well."},
    )

    r = client.get(f"/patients/{pid}/summary")
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "template"
    assert body["note_count"] == 1
    assert "Summary Test" in body["summary"]
    assert "Hypertension" in body["summary"]
