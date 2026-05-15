from __future__ import annotations


def _new_patient(client) -> str:
    r = client.post(
        "/patients",
        json={
            "name": "Note Owner",
            "date_of_birth": "1980-01-01",
            "contact": "+14155551111",
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
        f"/patients/{pid}/notes",
        json={"content": "Initial note"},
    )
    assert r.status_code == 201

    r2 = client.get(f"/patients/{pid}/notes")
    assert r2.status_code == 200
    body = r2.json()
    assert len(body) == 1
    assert body[0]["content"] == "Initial note"
    assert body[0]["timestamp"] is not None
    assert body[0]["created_at"] is not None


def test_add_note_updates_last_visit(client) -> None:
    pid = _new_patient(client)
    client.post(f"/patients/{pid}/notes", json={"content": "Visit"})
    patient = client.get(f"/patients/{pid}").json()
    assert patient["last_visit"] is not None


def test_delete_note(client) -> None:
    pid = _new_patient(client)
    note_id = client.post(
        f"/patients/{pid}/notes",
        json={"content": "Bye"},
    ).json()["id"]

    r = client.delete(f"/patients/{pid}/notes/{note_id}")
    assert r.status_code == 204

    r2 = client.get(f"/patients/{pid}/notes")
    assert r2.json() == []


def test_notes_404_for_unknown_patient(client) -> None:
    r = client.get("/patients/11111111-1111-1111-1111-111111111111/notes")
    assert r.status_code == 404


def test_note_validation_422(client) -> None:
    pid = _new_patient(client)
    r = client.post(f"/patients/{pid}/notes", json={"content": ""})
    assert r.status_code == 422


def test_cascade_delete(client) -> None:
    pid = _new_patient(client)
    client.post(
        f"/patients/{pid}/notes",
        json={"content": "Will be cascaded"},
    )

    assert client.delete(f"/patients/{pid}").status_code == 204
    assert client.get(f"/patients/{pid}").status_code == 404
