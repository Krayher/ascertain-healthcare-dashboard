"""Integration tests for seed. Requires Docker (testcontainers)."""
from __future__ import annotations

from app.models import Patient
from app.seed import seed


def test_seed_is_idempotent(db_session) -> None:
    first = seed(db_session)
    second = seed(db_session)
    total = db_session.query(Patient).count()
    assert first == 20
    assert second == 0
    assert total == 20
