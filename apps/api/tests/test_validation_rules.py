from __future__ import annotations


def _payload(**over) -> dict:
    base = {
        "name": "Validation Subject",
        "date_of_birth": "1990-01-01",
        "contact": "+14155550000",
        "blood_type": "O+",
        "status": "active",
        "conditions": [],
        "allergies": [],
    }
    base.update(over)
    return base


def _field_locs(payload: dict) -> list[str]:
    return [d["loc"][-1] for d in payload["detail"]]


def test_contact_must_include_phone_or_email(client) -> None:
    r = client.post("/patients", json=_payload(contact="please call me"))
    assert r.status_code == 422
    body = r.json()
    assert "contact" in _field_locs(body)
    assert any(
        "phone number or email" in d["msg"] for d in body["detail"]
    )


def test_contact_accepts_phone_only(client) -> None:
    assert client.post(
        "/patients", json=_payload(contact="+1 (415) 555-0142")
    ).status_code == 201


def test_contact_accepts_email_only(client) -> None:
    assert client.post(
        "/patients", json=_payload(contact="someone@example.com")
    ).status_code == 201


def test_contact_accepts_phone_and_email_combined(client) -> None:
    assert client.post(
        "/patients",
        json=_payload(contact="+14155550142 | a@b.com"),
    ).status_code == 201


def test_conditions_reject_empty_string(client) -> None:
    r = client.post(
        "/patients",
        json=_payload(conditions=["Asthma", "   "]),
    )
    assert r.status_code == 422
    assert "conditions" in _field_locs(r.json())


def test_conditions_reject_overlong_entry(client) -> None:
    r = client.post(
        "/patients",
        json=_payload(conditions=["x" * 81]),
    )
    assert r.status_code == 422
    body = r.json()
    assert "conditions" in _field_locs(body)
    assert any("at most 80 characters" in d["msg"] for d in body["detail"])


def test_allergies_reject_overlong_list(client) -> None:
    r = client.post(
        "/patients",
        json=_payload(allergies=[f"a{i}" for i in range(51)]),
    )
    assert r.status_code == 422
    assert "allergies" in _field_locs(r.json())


def test_conditions_trim_whitespace_on_accept(client) -> None:
    r = client.post(
        "/patients",
        json=_payload(conditions=["  Hypertension  "]),
    )
    assert r.status_code == 201
    assert r.json()["conditions"] == ["Hypertension"]
