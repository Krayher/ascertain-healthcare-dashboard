from __future__ import annotations

from app.seed import seed


def test_dashboard_endpoint(client, db_session) -> None:
    seed(db_session)
    r = client.get("/stats/dashboard")
    assert r.status_code == 200
    body = r.json()
    assert body["stats"]["total_patients"] == 20
    assert body["stats"]["active_patients"] >= 1
    assert body["stats"]["follow_up_patients"] >= 1
    assert body["stats"]["inactive_patients"] >= 0
    assert (
        body["stats"]["active_patients"]
        + body["stats"]["follow_up_patients"]
        + body["stats"]["inactive_patients"]
        == body["stats"]["total_patients"]
    )
    assert len(body["activity"]) == 14
    assert len(body["recent_notes"]) <= 10
