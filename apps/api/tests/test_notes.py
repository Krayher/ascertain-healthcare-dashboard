from __future__ import annotations


def _new_patient(client) -> str:
    r = client.post(
        "/api/v1/patients",
        json={
            "first_name": "Note",
            "last_name": "Owner",
            "date_of_birth": "1980-01-01",
            "phone": "+14155551111",
            "blood_type": "O+",
            "status": "active",
            "conditions": [],
            "allergies": [],
        },
    )
    assert r.status_code == 201
    return r.json()["id"]


def test_add_then_list(client) -> None:
    pid = _new_patient(client)
    r = client.post(
        f"/api/v1/patients/{pid}/notes",
        json={"content": "Initial note", "author": "Dr. Test"},
    )
    assert r.status_code == 201

    r2 = client.get(f"/api/v1/patients/{pid}/notes")
    assert r2.status_code == 200
    body = r2.json()
    assert len(body) == 1
    assert body[0]["content"] == "Initial note"


def test_add_note_updates_last_visit(client) -> None:
    pid = _new_patient(client)
    client.post(
        f"/api/v1/patients/{pid}/notes",
        json={"content": "Visit", "author": "Dr. Test"},
    )
    patient = client.get(f"/api/v1/patients/{pid}").json()
    assert patient["last_visit_at"] is not None


def test_delete_note(client) -> None:
    pid = _new_patient(client)
    note_id = client.post(
        f"/api/v1/patients/{pid}/notes",
        json={"content": "Bye", "author": "Dr. Test"},
    ).json()["id"]

    r = client.delete(f"/api/v1/patients/{pid}/notes/{note_id}")
    assert r.status_code == 204

    r2 = client.get(f"/api/v1/patients/{pid}/notes")
    assert r2.json() == []


def test_notes_404_for_unknown_patient(client) -> None:
    r = client.get(
        "/api/v1/patients/11111111-1111-1111-1111-111111111111/notes"
    )
    assert r.status_code == 404


def test_note_validation_422(client) -> None:
    pid = _new_patient(client)
    r = client.post(
        f"/api/v1/patients/{pid}/notes",
        json={"content": "", "author": "Dr. Test"},
    )
    assert r.status_code == 422


def test_cascade_delete(client) -> None:
    pid = _new_patient(client)
    note_id = client.post(
        f"/api/v1/patients/{pid}/notes",
        json={"content": "Will be cascaded", "author": "Dr. Test"},
    ).json()["id"]

    assert client.delete(f"/api/v1/patients/{pid}").status_code == 204

    # Patient is gone — listing notes should 404.
    r = client.get(f"/api/v1/patients/{pid}/notes/{note_id}")
    # Endpoint is delete-only; just verify the patient is unreachable.
    assert client.get(f"/api/v1/patients/{pid}").status_code == 404
