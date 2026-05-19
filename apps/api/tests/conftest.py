from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import sessionmaker

from app.db import Base, get_async_db, get_db
from app.main import create_app


@pytest.fixture(scope="session")
def _pg():
    pytest.importorskip("testcontainers.postgres")
    from testcontainers.postgres import PostgresContainer

    with PostgresContainer("postgres:16-alpine") as pg:
        yield pg


def _sync_url(pg) -> str:
    url = pg.get_connection_url()
    if url.startswith("postgresql+psycopg2://"):
        url = url.replace("postgresql+psycopg2://", "postgresql+psycopg://")
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://")
    return url


def _engine_for(pg):
    return create_engine(_sync_url(pg), future=True)


# --- sync fixtures (unchanged behaviour) ---


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


# --- async fixtures (opt-in for routers that use AsyncSession; see ADR-0008) ---


@pytest_asyncio.fixture
async def db_async_session(_pg) -> AsyncIterator[AsyncSession]:
    # Create schema synchronously first (Base.metadata.create_all is sync-only),
    # then hand back an async session bound to the same database.
    sync_engine = _engine_for(_pg)
    Base.metadata.drop_all(sync_engine)
    Base.metadata.create_all(sync_engine)
    sync_engine.dispose()

    async_engine = create_async_engine(_sync_url(_pg))
    async_maker = async_sessionmaker(
        bind=async_engine, expire_on_commit=False, class_=AsyncSession
    )
    async with async_maker() as session:
        yield session
    await async_engine.dispose()


@pytest_asyncio.fixture
async def async_client(db_async_session) -> AsyncIterator[AsyncClient]:
    app = create_app()

    async def _override():
        yield db_async_session

    app.dependency_overrides[get_async_db] = _override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
