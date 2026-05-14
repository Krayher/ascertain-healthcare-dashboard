from __future__ import annotations


def _payload(**over) -> dict:
    base = {
        "first_name": "Test",
        "last_name": "Patient",
        "date_of_birth": "1990-01-01",
        "phone": "+14155550000",
        "blood_type": "O+",
        "status": "active",
        "conditions": [],
        "allergies": [],
    }
    base.update(over)
    return base


def test_create_then_read(client) -> None:
    r = client.post("/api/v1/patients", json=_payload())
    assert r.status_code == 201
    body = r.json()
    pid = body["id"]
    assert body["mrn"].startswith("MRN-")
    assert body["age"] >= 30

    r2 = client.get(f"/api/v1/patients/{pid}")
    assert r2.status_code == 200
    assert r2.json()["id"] == pid


def test_validation_422_on_bad_phone(client) -> None:
    r = client.post("/api/v1/patients", json=_payload(phone="oops"))
    assert r.status_code == 422


def test_validation_422_on_future_dob(client) -> None:
    r = client.post("/api/v1/patients", json=_payload(date_of_birth="3000-01-01"))
    assert r.status_code == 422


def test_get_404_for_unknown(client) -> None:
    r = client.get("/api/v1/patients/11111111-1111-1111-1111-111111111111")
    assert r.status_code == 404


def test_update_then_read(client) -> None:
    pid = client.post("/api/v1/patients", json=_payload()).json()["id"]
    r = client.put(f"/api/v1/patients/{pid}", json=_payload(first_name="Renamed"))
    assert r.status_code == 200
    assert r.json()["first_name"] == "Renamed"


def test_delete_204_then_404(client) -> None:
    pid = client.post("/api/v1/patients", json=_payload()).json()["id"]
    r = client.delete(f"/api/v1/patients/{pid}")
    assert r.status_code == 204
    r2 = client.get(f"/api/v1/patients/{pid}")
    assert r2.status_code == 404


def test_list_pagination(client) -> None:
    for i in range(25):
        client.post("/api/v1/patients", json=_payload(first_name=f"P{i}"))
    r = client.get("/api/v1/patients?page=2&page_size=10")
    body = r.json()
    assert body["page"] == 2
    assert body["page_size"] == 10
    assert len(body["items"]) == 10
    assert body["total"] >= 25
    assert body["total_pages"] >= 3


def test_search_finds_unique_name(client) -> None:
    client.post(
        "/api/v1/patients",
        json=_payload(first_name="Zenobia", last_name="Marquez"),
    )
    r = client.get("/api/v1/patients?search=zenobia")
    assert any(p["first_name"] == "Zenobia" for p in r.json()["items"])


def test_status_filter(client) -> None:
    client.post("/api/v1/patients", json=_payload(status="follow_up"))
    client.post("/api/v1/patients", json=_payload(status="active"))
    r = client.get("/api/v1/patients?status=follow_up")
    body = r.json()
    assert body["total"] >= 1
    assert all(p["status"] == "follow_up" for p in body["items"])


def test_invalid_sort_400(client) -> None:
    r = client.get("/api/v1/patients?sort=nonsense")
    assert r.status_code == 400


def test_invalid_status_400(client) -> None:
    r = client.get("/api/v1/patients?status=banana")
    assert r.status_code == 400
