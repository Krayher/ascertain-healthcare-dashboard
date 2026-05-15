from __future__ import annotations


def _make(client, **over) -> str:
    base = {
        "name": "Filter Subject",
        "date_of_birth": "1990-01-01",
        "contact": "+14155550000",
        "blood_type": "O+",
        "status": "active",
        "conditions": [],
        "allergies": [],
    }
    base.update(over)
    r = client.post("/patients", json=base)
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_blood_type_filter(client) -> None:
    _make(client, name="A Pos One", blood_type="A+")
    _make(client, name="A Pos Two", blood_type="A+")
    _make(client, name="B Neg", blood_type="B-")
    r = client.get("/patients?blood_type=A%2B")
    body = r.json()
    assert body["total"] == 2
    assert all(p["blood_type"] == "A+" for p in body["items"])


def test_invalid_blood_type_400(client) -> None:
    assert client.get("/patients?blood_type=X+").status_code == 400


def test_condition_filter_substring(client) -> None:
    _make(client, name="Has Asthma", conditions=["Asthma", "Hypertension"])
    _make(client, name="Has Diabetes", conditions=["Type 2 diabetes"])
    _make(client, name="Healthy", conditions=[])
    r = client.get("/patients?condition=asthma")
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Has Asthma"


def test_age_range_filter(client) -> None:
    _make(client, name="Young", date_of_birth="2010-01-01")  # ~16 in 2026
    _make(client, name="Middle", date_of_birth="1980-01-01")  # ~46
    _make(client, name="Old", date_of_birth="1950-01-01")  # ~76
    r = client.get("/patients?age_min=30&age_max=60")
    body = r.json()
    names = {p["name"] for p in body["items"]}
    assert "Middle" in names
    assert "Young" not in names
    assert "Old" not in names


def test_age_min_only(client) -> None:
    _make(client, name="Kid", date_of_birth="2015-01-01")
    _make(client, name="Adult", date_of_birth="1980-01-01")
    r = client.get("/patients?age_min=18")
    names = {p["name"] for p in r.json()["items"]}
    assert "Adult" in names
    assert "Kid" not in names


def test_age_min_greater_than_max_400(client) -> None:
    assert client.get("/patients?age_min=50&age_max=10").status_code == 400


def test_filters_compose(client) -> None:
    _make(client, name="Match", blood_type="O+", status="active",
          conditions=["Hypertension"])
    _make(client, name="Wrong status", blood_type="O+", status="inactive",
          conditions=["Hypertension"])
    _make(client, name="Wrong condition", blood_type="O+", status="active",
          conditions=["Asthma"])
    r = client.get(
        "/patients?blood_type=O%2B&status=active&condition=hyper"
    )
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Match"
