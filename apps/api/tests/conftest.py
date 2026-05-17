from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_db
from app.main import create_app


@pytest.fixture(scope="session")
def _pg():
    pytest.importorskip("testcontainers.postgres")
    from testcontainers.postgres import PostgresContainer

    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg


def _engine_for(pg):
    url = pg.get_connection_url()
    if url.startswith("postgresql+psycopg2://"):
        url = url.replace("postgresql+psycopg2://", "postgresql+psycopg://")
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://")
    return create_engine(url, future=True)


@pytest.fixture
def db_session(_pg):
    engine = _engine_for(_pg)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    session_maker = sessionmaker(bind=engine, expire_on_commit=False, future=True)
    with session_maker() as session:
        yield session


@pytest.fixture
def client(db_session) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_db] = lambda: db_session
    return TestClient(app)


@pytest.fixture
def simple_client() -> TestClient:
    """Client without DB override — for non-DB endpoints like /health."""
    return TestClient(create_app())
