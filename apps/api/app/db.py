from collections.abc import AsyncGenerator, Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.settings import get_settings


class Base(DeclarativeBase):
    pass


_settings = get_settings()

# Sync stack — default for routers + services.
engine = create_engine(_settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Async stack — opt-in for routers that need concurrency (see ADR-0008).
# psycopg 3 supports async natively; same URL scheme works for both engines
# when we swap "+psycopg" for the async dialect "+psycopg" (the dialect handles
# both modes), so no driver change is required.
_async_url = _settings.database_url
if _async_url.startswith("postgresql+psycopg2://"):
    _async_url = _async_url.replace("postgresql+psycopg2://", "postgresql+psycopg://")

async_engine = create_async_engine(_async_url, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine, autoflush=False, expire_on_commit=False, class_=AsyncSession
)


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as db:
        yield db
