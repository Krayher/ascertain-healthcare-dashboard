from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.seed import PATIENTS, seed


def _seed_via_sync(pg) -> None:
    from tests.conftest import _sync_url

    engine = create_engine(_sync_url(pg))
    session_maker = sessionmaker(bind=engine, expire_on_commit=False)
    with session_maker() as session:
        seed(session)
    engine.dispose()


@pytest.mark.asyncio
async def test_dashboard_endpoint(async_client, _pg) -> None:
    _seed_via_sync(_pg)

    response = await async_client.get("/stats/dashboard")
    assert response.status_code == 200

    body = response.json()
    assert body["stats"]["total_patients"] == len(PATIENTS)
    assert body["stats"]["active_patients"] >= 1
    assert body["stats"]["follow_up_patients"] >= 1
    assert body["stats"]["inactive_patients"] >= 0
    assert body["stats"]["notes_this_week"] >= 0
    assert len(body["activity"]) == 14
    assert all(isinstance(n, int) for n in body["activity"])
    assert len(body["recent_notes"]) <= 10
    for note in body["recent_notes"]:
        assert "patient_id" in note
        assert "patient_name" in note
        assert "content" in note
        assert "timestamp" in note  # frontend reads this; not created_at
