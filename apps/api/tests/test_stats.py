from __future__ import annotations

from app.seed import seed


def test_dashboard_endpoint(client, db_session) -> None:
    seed(db_session)
    r = client.get("/api/v1/stats/dashboard")
    assert r.status_code == 200
    body = r.json()
    assert body["stats"]["total_patients"] == 20
    assert body["stats"]["active_patients"] >= 1
    assert body["stats"]["follow_up_patients"] >= 1
    assert len(body["activity"]) == 14
    assert len(body["recent_notes"]) <= 10
