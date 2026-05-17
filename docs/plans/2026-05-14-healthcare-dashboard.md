# Healthcare Dashboard — Implementation Plan

> ⚠️ **Historical artifact — the original day-1 implementation plan.**
> Kept for transparency about how the project was scoped and executed.
> Several decisions evolved during implementation (URL prefix dropped,
> field names consolidated, stretch goals expanded). For what is
> *actually shipped*, read [`SPEC.md`](../../SPEC.md) at the repo root.

**Goal:** Build a full-stack patient management dashboard (FastAPI + Postgres + React/Vite) implementing all five parts of the take-home brief plus a curated subset of stretch goals (Alembic, sort/filter, virtualization, dark/light theme, Pytest + Vitest, GitHub Actions CI), packaged with Docker Compose `develop.watch` and documented with ADRs + HLD + manual + K8s parity manifests.

**Spec:** `docs/specs/2026-05-14-healthcare-dashboard-design.md` (also historical — see [`SPEC.md`](../../SPEC.md) for current shipped state)

**Architecture:** Monorepo with `apps/api` (FastAPI) and `apps/web` (Vite + React). Two-layer backend (routers → services). Frontend organized by feature folders. OpenAPI types codegen'd into the web app. Pluggable summarizer (template default, Claude optional). Compose orchestrates `db` + `migrate` + `api` + `web` with `develop.watch` for hot-reload.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy 2.x, Alembic, Pydantic v2, Postgres 16, uv. Node 20, React 18, TypeScript strict, Vite, React Router v6, TanStack Query, Zustand, React Hook Form, Zod, Tailwind, shadcn/ui, lucide, TanStack Virtual, Vitest + RTL. Docker Compose, GitHub Actions.

**Conventions used throughout this plan:**
- Each phase ends with a working, runnable state. You can stop after any phase and the repo still functions.
- Tests are written before non-trivial logic. Pure CRUD wiring is exercised through endpoint tests rather than unit-first TDD.
- File paths are absolute from repo root.
- No `git commit` steps are included — review and commit at your own cadence.
- Inline code blocks are complete; copy-paste them.

---

## Phase 0 — Repo skeleton

**Files created:**
- `.gitignore`
- `.editorconfig`
- `README.md` (placeholder, finalized in Phase 11)
- `.env.example`
- `apps/api/.gitkeep`, `apps/web/.gitkeep`

### Step 0.1 — Root `.gitignore`

Create `/Users/aislandiego/Projects/ascertain-healthcare-dashboard/.gitignore`:

```gitignore
# Python
__pycache__/
*.pyc
.venv/
.pytest_cache/
.ruff_cache/
.mypy_cache/
htmlcov/
.coverage

# Node
node_modules/
dist/
.vite/
*.log

# Env
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
.DS_Store

# Generated
apps/web/src/lib/api/schema.ts
```

### Step 0.2 — `.editorconfig`

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
insert_final_newline = true
trim_trailing_whitespace = true

[*.py]
indent_size = 4
```

### Step 0.3 — `.env.example`

```bash
# Postgres
POSTGRES_USER=ascertain
POSTGRES_PASSWORD=ascertain
POSTGRES_DB=ascertain

# API
DATABASE_URL=postgresql+psycopg://ascertain:ascertain@db:5432/ascertain
API_CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=INFO

# Optional — enables Claude summarizer when set
ANTHROPIC_API_KEY=

# Web
VITE_API_URL=http://localhost:8000/api/v1
```

### Step 0.4 — Empty README placeholder

```markdown
# Ascertain · Healthcare Dashboard

> Full-stack patient management dashboard. See `docs/` for the spec, ADRs, and manual.

Quickstart will live here once the stack runs end-to-end.
```

---

## Phase 1 — Backend foundation

**Goal:** FastAPI service starts inside Docker, connects to Postgres, exposes `GET /health` returning `{"status": "ok"}`, and Alembic can create the initial schema (empty for now).

**Files created:**
- `apps/api/pyproject.toml`
- `apps/api/Dockerfile`
- `apps/api/.dockerignore`
- `apps/api/alembic.ini`
- `apps/api/alembic/env.py`
- `apps/api/alembic/script.py.mako`
- `apps/api/app/__init__.py`
- `apps/api/app/main.py`
- `apps/api/app/settings.py`
- `apps/api/app/db.py`
- `apps/api/app/routers/__init__.py`
- `apps/api/app/routers/health.py`
- `apps/api/app/models/__init__.py` (base only)
- `apps/api/tests/__init__.py`
- `apps/api/tests/conftest.py`
- `apps/api/tests/test_health.py`
- `docker-compose.yml`

### Step 1.1 — `apps/api/pyproject.toml`

```toml
[project]
name = "ascertain-api"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.115",
  "uvicorn[standard]>=0.32",
  "sqlalchemy>=2.0.36",
  "psycopg[binary]>=3.2",
  "alembic>=1.14",
  "pydantic>=2.9",
  "pydantic-settings>=2.6",
  "structlog>=24.4",
  "anthropic>=0.39",
  "python-multipart>=0.0.12",
]

[dependency-groups]
dev = [
  "pytest>=8.3",
  "pytest-asyncio>=0.24",
  "httpx>=0.27",
  "ruff>=0.7",
  "mypy>=1.13",
  "testcontainers[postgres]>=4.8",
]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP", "N", "RUF"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

### Step 1.2 — `apps/api/app/settings.py`

```python
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = Field(
        default="postgresql+psycopg://ascertain:ascertain@localhost:5432/ascertain"
    )
    api_cors_origins: str = Field(default="http://localhost:5173")
    log_level: str = Field(default="INFO")
    anthropic_api_key: str | None = Field(default=None)

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

### Step 1.3 — `apps/api/app/db.py`

```python
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.settings import get_settings


class Base(DeclarativeBase):
    pass


_settings = get_settings()
engine = create_engine(_settings.database_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### Step 1.4 — `apps/api/app/routers/health.py`

```python
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
```

### Step 1.5 — `apps/api/app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health
from app.settings import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Ascertain API", version="0.1.0", openapi_url="/api/v1/openapi.json")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router, prefix="/api/v1")
    return app


app = create_app()
```

### Step 1.6 — `apps/api/alembic.ini`

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
sqlalchemy.url = postgresql+psycopg://ascertain:ascertain@db:5432/ascertain

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

### Step 1.7 — `apps/api/alembic/env.py`

```python
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.db import Base
from app.settings import get_settings

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", get_settings().database_url)

# Import models so they register with Base.metadata
import app.models  # noqa: F401,E402

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### Step 1.8 — `apps/api/alembic/script.py.mako`

```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

revision: str = ${repr(up_revision)}
down_revision: str | None = ${repr(down_revision)}
branch_labels: str | Sequence[str] | None = ${repr(branch_labels)}
depends_on: str | Sequence[str] | None = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

### Step 1.9 — `apps/api/app/models/__init__.py`

```python
# Models are imported here so Alembic autogenerate sees them.
# Phase 2 adds Patient + Note.
```

### Step 1.10 — `apps/api/Dockerfile`

```dockerfile
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --no-cache-dir uv \
    && uv pip install --system --no-cache .

COPY . .

EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --retries=10 \
  CMD curl -fsS http://localhost:8000/api/v1/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Step 1.11 — `apps/api/.dockerignore`

```
.venv/
__pycache__/
.pytest_cache/
.ruff_cache/
.mypy_cache/
tests/
*.md
```

### Step 1.12 — `docker-compose.yml` (initial)

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 3s
      retries: 20

  migrate:
    build: ./apps/api
    command: ["alembic", "upgrade", "head"]
    environment:
      DATABASE_URL: ${DATABASE_URL}
    depends_on:
      db:
        condition: service_healthy

  api:
    build: ./apps/api
    environment:
      DATABASE_URL: ${DATABASE_URL}
      API_CORS_ORIGINS: ${API_CORS_ORIGINS}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
    depends_on:
      db:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    ports:
      - "8000:8000"
    develop:
      watch:
        - action: sync
          path: ./apps/api/app
          target: /app/app
        - action: rebuild
          path: ./apps/api/pyproject.toml

volumes:
  db_data:
```

### Step 1.13 — `apps/api/tests/conftest.py`

```python
import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())
```

### Step 1.14 — `apps/api/tests/test_health.py`

```python
def test_health_returns_ok(client) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

### Step 1.15 — First Alembic revision (empty)

Inside `apps/api`:

```bash
alembic revision -m "initial empty schema"
```

Leave `upgrade()` / `downgrade()` as `pass`. Real schema lands in Phase 2.

### Step 1.16 — Verify it boots

```bash
cp .env.example .env
docker compose up --build db migrate api
# In another shell:
curl -fsS http://localhost:8000/api/v1/health
# Expected: {"status":"ok"}
```

Also locally:
```bash
cd apps/api
uv sync
uv run pytest -v
# Expected: 1 passed
```

---

## Phase 2 — Patient + Note models, schemas, migration, seed

**Goal:** Domain model lives in Postgres, Alembic creates it, and the seed script populates 20 patients + their notes idempotently.

**Files created:**
- `apps/api/app/models/patient.py`
- `apps/api/app/models/note.py`
- `apps/api/app/models/__init__.py` (re-exports)
- `apps/api/app/schemas/__init__.py`
- `apps/api/app/schemas/patient.py`
- `apps/api/app/schemas/note.py`
- `apps/api/app/schemas/common.py` (Page envelope)
- `apps/api/app/seed.py`
- `apps/api/alembic/versions/<rev>_patients_and_notes.py` (autogenerated)
- `apps/api/tests/test_seed.py`

### Step 2.1 — `apps/api/app/models/patient.py`

```python
import uuid
from datetime import date, datetime

from sqlalchemy import ARRAY, Date, DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    date_of_birth: Mapped[date] = mapped_column(Date)
    phone: Mapped[str] = mapped_column(String(40))
    email: Mapped[str | None] = mapped_column(String(160), nullable=True)
    address: Mapped[str | None] = mapped_column(String(240), nullable=True)
    blood_type: Mapped[str] = mapped_column(String(3))
    status: Mapped[str] = mapped_column(String(16), default="active", index=True)
    conditions: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    allergies: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    last_visit_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    notes: Mapped[list["Note"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan", passive_deletes=True
    )
```

### Step 2.2 — `apps/api/app/models/note.py`

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="CASCADE"),
        index=True,
    )
    content: Mapped[str] = mapped_column(Text)
    author: Mapped[str] = mapped_column(String(120))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    patient: Mapped[Patient] = relationship(back_populates="notes")
```

### Step 2.3 — `apps/api/app/models/__init__.py`

```python
from app.models.note import Note
from app.models.patient import Patient

__all__ = ["Note", "Patient"]
```

### Step 2.4 — `apps/api/app/schemas/common.py`

```python
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    page: int
    page_size: int
    total: int
    total_pages: int
```

### Step 2.5 — `apps/api/app/schemas/patient.py`

```python
import re
import uuid
from datetime import date, datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, EmailStr, Field, computed_field, field_validator

PHONE_RE = re.compile(r"^\+?[0-9 .()\-]{7,20}$")


class BloodType(str, Enum):
    O_POS = "O+"
    O_NEG = "O-"
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"


class PatientStatus(str, Enum):
    active = "active"
    follow_up = "follow_up"
    inactive = "inactive"


class PatientBase(BaseModel):
    first_name: Annotated[str, Field(min_length=1, max_length=80)]
    last_name: Annotated[str, Field(min_length=1, max_length=80)]
    date_of_birth: date
    phone: Annotated[str, Field(min_length=7, max_length=20)]
    email: EmailStr | None = None
    address: Annotated[str | None, Field(default=None, max_length=240)]
    blood_type: BloodType
    status: PatientStatus = PatientStatus.active
    conditions: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)

    @field_validator("phone")
    @classmethod
    def _phone_shape(cls, v: str) -> str:
        if not PHONE_RE.match(v):
            raise ValueError("Phone must look like +14155550142 or similar.")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def _dob_past(cls, v: date) -> date:
        if v >= date.today():
            raise ValueError("Date of birth must be in the past.")
        return v


class PatientCreate(PatientBase):
    pass


class PatientUpdate(PatientBase):
    pass


class PatientRead(PatientBase):
    id: uuid.UUID
    last_visit_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    @computed_field  # type: ignore[misc]
    @property
    def age(self) -> int:
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

    @computed_field  # type: ignore[misc]
    @property
    def mrn(self) -> str:
        return f"MRN-{str(self.id).replace('-', '')[:5].upper()}"

    class Config:
        from_attributes = True
```

### Step 2.6 — `apps/api/app/schemas/note.py`

```python
import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field


class NoteBase(BaseModel):
    content: Annotated[str, Field(min_length=1, max_length=4000)]
    author: Annotated[str, Field(min_length=1, max_length=120)]


class NoteCreate(NoteBase):
    created_at: datetime | None = None


class NoteRead(NoteBase):
    id: uuid.UUID
    patient_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True
```

### Step 2.7 — Generate Alembic migration

Inside `apps/api`, with Postgres reachable at the `DATABASE_URL` (point it at `localhost` temporarily, or run from inside the container):

```bash
alembic revision --autogenerate -m "patients and notes"
```

Hand-edit the generated revision to confirm:
- `patients` table with all columns matching the model.
- `notes` table with FK to `patients.id` on delete cascade.
- Indexes on `patients(status)` and `notes(patient_id)`.
- An additional index `ix_patients_last_name_first_name` if autogenerate didn't add it:

```python
op.create_index(
    "ix_patients_last_name_first_name",
    "patients",
    ["last_name", "first_name"],
)
```

### Step 2.8 — `apps/api/app/seed.py`

```python
"""Idempotent seed script. Inserts 20 patients with notes if patients < 20."""
from __future__ import annotations

import random
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import Note, Patient

PATIENTS: list[dict] = [
    {"first_name": "Marisol", "last_name": "Ortega", "dob": date(1971, 8, 4),
     "phone": "+14155550142", "email": "m.ortega@example.com",
     "address": "2812 Folsom St, San Francisco, CA",
     "blood_type": "O+", "status": "active",
     "conditions": ["Hypertension", "Type 2 diabetes"], "allergies": ["Sulfa drugs"]},
    {"first_name": "Theo", "last_name": "Whitfield", "dob": date(1958, 2, 19),
     "phone": "+14155550118", "email": None,
     "address": "118 Clement St, San Francisco, CA",
     "blood_type": "A-", "status": "follow_up",
     "conditions": ["CHF", "CKD stage 3"], "allergies": []},
    {"first_name": "Junpei", "last_name": "Saito", "dob": date(1993, 11, 30),
     "phone": "+14155550984", "email": "j.saito@example.com", "address": None,
     "blood_type": "B+", "status": "active",
     "conditions": [], "allergies": []},
    {"first_name": "Asha", "last_name": "Patel", "dob": date(1984, 5, 22),
     "phone": "+14155550031", "email": "asha.p@example.com",
     "address": "44 Divisadero, SF, CA",
     "blood_type": "AB+", "status": "inactive",
     "conditions": ["Asthma"], "allergies": ["Penicillin"]},
    {"first_name": "Eleanor", "last_name": "Huxley", "dob": date(1948, 1, 9),
     "phone": "+14155550612", "email": None,
     "address": "1900 California St, SF, CA",
     "blood_type": "O-", "status": "active",
     "conditions": ["Atrial fibrillation"], "allergies": ["Penicillin"]},
    {"first_name": "Rafael", "last_name": "Becerra", "dob": date(1997, 3, 14),
     "phone": "+14155550227", "email": "r.becerra@example.com", "address": None,
     "blood_type": "A+", "status": "active",
     "conditions": ["Migraine"], "allergies": []},
    {"first_name": "Naledi", "last_name": "Khumalo", "dob": date(1990, 7, 7),
     "phone": "+14155550118", "email": "n.khumalo@example.com",
     "address": "2300 Sutter St, SF, CA",
     "blood_type": "O+", "status": "follow_up",
     "conditions": ["Hypothyroidism"], "allergies": []},
    {"first_name": "Yusuf", "last_name": "Demir", "dob": date(1965, 9, 1),
     "phone": "+14155550401", "email": None, "address": None,
     "blood_type": "B-", "status": "active",
     "conditions": ["GERD"], "allergies": []},
    {"first_name": "Sophie", "last_name": "Laurent", "dob": date(1980, 12, 12),
     "phone": "+14155550779", "email": "sophie.l@example.com",
     "address": "1212 Lombard St, SF, CA",
     "blood_type": "AB-", "status": "active",
     "conditions": [], "allergies": ["Latex"]},
    {"first_name": "Devon", "last_name": "Iverson", "dob": date(1976, 4, 25),
     "phone": "+14155550882", "email": None, "address": None,
     "blood_type": "A+", "status": "follow_up",
     "conditions": ["Sleep apnea"], "allergies": []},
    {"first_name": "Priya", "last_name": "Iyer", "dob": date(2001, 6, 18),
     "phone": "+14155550334", "email": "p.iyer@example.com", "address": None,
     "blood_type": "O+", "status": "active",
     "conditions": [], "allergies": ["Shellfish"]},
    {"first_name": "Henry", "last_name": "Okonkwo", "dob": date(1955, 10, 2),
     "phone": "+14155550456", "email": None,
     "address": "98 Page St, SF, CA",
     "blood_type": "B+", "status": "active",
     "conditions": ["Hypertension"], "allergies": []},
    {"first_name": "Linnea", "last_name": "Bergstrom", "dob": date(1988, 2, 14),
     "phone": "+14155550101", "email": "linnea.b@example.com", "address": None,
     "blood_type": "A-", "status": "active",
     "conditions": [], "allergies": []},
    {"first_name": "Carlos", "last_name": "Mendoza", "dob": date(1962, 8, 30),
     "phone": "+14155550567", "email": "c.mendoza@example.com",
     "address": "200 Valencia St, SF, CA",
     "blood_type": "O+", "status": "follow_up",
     "conditions": ["COPD"], "allergies": []},
    {"first_name": "Imani", "last_name": "Brooks", "dob": date(1994, 5, 5),
     "phone": "+14155550719", "email": "imani.b@example.com", "address": None,
     "blood_type": "AB+", "status": "active",
     "conditions": [], "allergies": []},
    {"first_name": "Wei", "last_name": "Chen", "dob": date(1972, 11, 21),
     "phone": "+14155550845", "email": None, "address": None,
     "blood_type": "B-", "status": "inactive",
     "conditions": ["Hyperlipidemia"], "allergies": []},
    {"first_name": "Magdalena", "last_name": "Rossi", "dob": date(1969, 1, 27),
     "phone": "+14155550293", "email": "m.rossi@example.com",
     "address": "55 Castro St, SF, CA",
     "blood_type": "A+", "status": "active",
     "conditions": ["Osteoarthritis"], "allergies": ["Ibuprofen"]},
    {"first_name": "Omar", "last_name": "Hassan", "dob": date(2003, 3, 9),
     "phone": "+14155550624", "email": "omar.h@example.com", "address": None,
     "blood_type": "O-", "status": "active",
     "conditions": [], "allergies": ["Peanuts"]},
    {"first_name": "Beatrice", "last_name": "Voss", "dob": date(1944, 7, 17),
     "phone": "+14155550850", "email": None,
     "address": "12 Steiner St, SF, CA",
     "blood_type": "AB-", "status": "follow_up",
     "conditions": ["Diabetes type 2", "Macular degeneration"], "allergies": []},
    {"first_name": "Kenji", "last_name": "Tanaka", "dob": date(1983, 9, 28),
     "phone": "+14155550902", "email": "k.tanaka@example.com", "address": None,
     "blood_type": "O+", "status": "active",
     "conditions": [], "allergies": []},
]

NOTE_SNIPPETS = [
    "Routine check-up. Vitals within normal limits.",
    "Patient reports occasional headaches; recommended hydration log.",
    "Increased lisinopril to 20mg daily. Home BP log review at next visit.",
    "A1C trending down. Continue current metformin dose.",
    "Discussed sleep hygiene. Patient will trial new bedtime routine for 2 weeks.",
    "Annual physical complete; labs ordered (CMP, lipid, A1C).",
    "Counseled on sodium intake and weekly cuff checks.",
    "Mild bilateral ankle edema; considering low-dose diuretic if persistent.",
    "Patient stable. Follow up in 3 months unless symptoms recur.",
    "Reviewed inhaler technique; refilled albuterol.",
]

AUTHORS = ["Dr. A. Reeves", "Dr. R. Bhat", "Dr. K. Tran"]


def seed(session: Session) -> int:
    existing = session.query(Patient).count()
    if existing >= len(PATIENTS):
        return 0

    rng = random.Random(20260514)  # deterministic
    inserted = 0
    now = datetime.now(timezone.utc)

    for spec in PATIENTS:
        if session.query(Patient).filter_by(
            first_name=spec["first_name"], last_name=spec["last_name"]
        ).first():
            continue

        patient = Patient(
            id=uuid.uuid4(),
            first_name=spec["first_name"],
            last_name=spec["last_name"],
            date_of_birth=spec["dob"],
            phone=spec["phone"],
            email=spec["email"],
            address=spec["address"],
            blood_type=spec["blood_type"],
            status=spec["status"],
            conditions=spec["conditions"],
            allergies=spec["allergies"],
        )

        n_notes = rng.randint(3, 8)
        most_recent: datetime | None = None
        for _ in range(n_notes):
            days_ago = rng.randint(1, 90)
            ts = now - timedelta(days=days_ago, hours=rng.randint(0, 23))
            note = Note(
                content=rng.choice(NOTE_SNIPPETS),
                author=rng.choice(AUTHORS),
                created_at=ts,
            )
            patient.notes.append(note)
            if most_recent is None or ts > most_recent:
                most_recent = ts

        patient.last_visit_at = most_recent
        session.add(patient)
        inserted += 1

    session.commit()
    return inserted


def main() -> None:
    with SessionLocal() as session:
        inserted = seed(session)
        print(f"Seed complete; inserted {inserted} patients.")


if __name__ == "__main__":
    main()
```

### Step 2.9 — Wire seed into Compose

Update the `migrate` service in `docker-compose.yml` to also seed:

```yaml
  migrate:
    build: ./apps/api
    command: ["sh", "-c", "alembic upgrade head && python -m app.seed"]
    environment:
      DATABASE_URL: ${DATABASE_URL}
    depends_on:
      db:
        condition: service_healthy
```

### Step 2.10 — Seed idempotency test

`apps/api/tests/test_seed.py`:

```python
import os

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.models import Patient
from app.seed import seed


@pytest.fixture
def session():
    # Use the testcontainer or DATABASE_URL pointed at a disposable DB.
    # For unit-style coverage we use SQLite + skip ARRAY columns? Postgres-only -> mark integration.
    pytest.importorskip("testcontainers.postgres")
    from testcontainers.postgres import PostgresContainer

    with PostgresContainer("postgres:16-alpine") as pg:
        url = pg.get_connection_url().replace("postgresql://", "postgresql+psycopg://")
        engine = create_engine(url)
        Base.metadata.create_all(engine)
        Session = sessionmaker(bind=engine, expire_on_commit=False)
        with Session() as s:
            yield s


def test_seed_is_idempotent(session) -> None:
    first = seed(session)
    second = seed(session)
    total = session.query(Patient).count()
    assert first == 20
    assert second == 0
    assert total == 20
```

Run: `uv run pytest tests/test_seed.py -v` — requires Docker for testcontainers, so document this as the integration-tier test. Phase 6 adds CRUD tests that run in the same way.

### Step 2.11 — Verify the stack

```bash
docker compose down -v
docker compose up --build
# Wait for the API health check to flip to "healthy".
curl http://localhost:8000/api/v1/openapi.json | jq '.paths | keys'
# Expected: ["/api/v1/health"]
```

20 patients exist in the DB (verifiable with `docker compose exec db psql -U ascertain -c 'select count(*) from patients;'` → `20`).

---

## Phase 3 — Patients CRUD + sort/filter/pagination

**Goal:** All `/patients` endpoints work end-to-end with validation, pagination, search, and sort.

**Files created/modified:**
- `apps/api/app/services/__init__.py`
- `apps/api/app/services/patients.py`
- `apps/api/app/routers/patients.py`
- `apps/api/app/main.py` (mount router)
- `apps/api/tests/test_patients.py`

### Step 3.1 — `apps/api/app/services/patients.py`

```python
from __future__ import annotations

import uuid
from typing import Literal

from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.orm import Session

from app.models import Patient
from app.schemas.patient import PatientCreate, PatientUpdate

SortField = Literal["last_visit_at", "name", "created_at"]
SortOrder = Literal["asc", "desc"]
ALLOWED_STATUS = {"active", "follow_up", "inactive"}


class PatientNotFound(Exception):
    pass


def list_patients(
    db: Session,
    *,
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    status: str | None = None,
    sort: SortField = "last_visit_at",
    order: SortOrder = "desc",
) -> tuple[list[Patient], int]:
    if status and status not in ALLOWED_STATUS:
        raise ValueError(f"Unknown status: {status}")

    q = select(Patient)
    count_q = select(func.count()).select_from(Patient)

    if status:
        q = q.where(Patient.status == status)
        count_q = count_q.where(Patient.status == status)

    if search:
        like = f"%{search.lower()}%"
        condition = or_(
            func.lower(Patient.first_name).like(like),
            func.lower(Patient.last_name).like(like),
            func.lower(func.cast(Patient.id, type_=__import__("sqlalchemy").String)).like(like),
        )
        q = q.where(condition)
        count_q = count_q.where(condition)

    direction = desc if order == "desc" else asc
    if sort == "last_visit_at":
        q = q.order_by(direction(Patient.last_visit_at).nullslast(), asc(Patient.last_name))
    elif sort == "name":
        q = q.order_by(direction(Patient.last_name), asc(Patient.first_name))
    elif sort == "created_at":
        q = q.order_by(direction(Patient.created_at))

    total = db.scalar(count_q) or 0
    items = list(db.scalars(q.offset((page - 1) * page_size).limit(page_size)))
    return items, total


def get_patient(db: Session, patient_id: uuid.UUID) -> Patient:
    patient = db.get(Patient, patient_id)
    if not patient:
        raise PatientNotFound(str(patient_id))
    return patient


def create_patient(db: Session, payload: PatientCreate) -> Patient:
    patient = Patient(**payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def update_patient(db: Session, patient_id: uuid.UUID, payload: PatientUpdate) -> Patient:
    patient = get_patient(db, patient_id)
    for k, v in payload.model_dump().items():
        setattr(patient, k, v)
    db.commit()
    db.refresh(patient)
    return patient


def delete_patient(db: Session, patient_id: uuid.UUID) -> None:
    patient = get_patient(db, patient_id)
    db.delete(patient)
    db.commit()
```

(The cast-to-string search hack lets us match against the UUID for MRN-style lookups; cheap and effective at this scale.)

### Step 3.2 — `apps/api/app/routers/patients.py`

```python
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.common import Page
from app.schemas.patient import PatientCreate, PatientRead, PatientUpdate
from app.services import patients as svc

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=Page[PatientRead])
def list_patients(
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = None,
    status_: str | None = Query(None, alias="status"),
    sort: str = Query("last_visit_at"),
    order: str = Query("desc"),
) -> Page[PatientRead]:
    try:
        items, total = svc.list_patients(
            db,
            page=page,
            page_size=page_size,
            search=search,
            status=status_,
            sort=sort,  # type: ignore[arg-type]
            order=order,  # type: ignore[arg-type]
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e

    total_pages = (total + page_size - 1) // page_size
    return Page[PatientRead](
        items=[PatientRead.model_validate(p) for p in items],
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get("/{patient_id}", response_model=PatientRead)
def get_patient(patient_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> PatientRead:
    try:
        return PatientRead.model_validate(svc.get_patient(db, patient_id))
    except svc.PatientNotFound as e:
        raise HTTPException(status_code=404, detail="Patient not found") from e


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def create_patient(
    payload: PatientCreate, db: Annotated[Session, Depends(get_db)]
) -> PatientRead:
    return PatientRead.model_validate(svc.create_patient(db, payload))


@router.put("/{patient_id}", response_model=PatientRead)
def update_patient(
    patient_id: uuid.UUID,
    payload: PatientUpdate,
    db: Annotated[Session, Depends(get_db)],
) -> PatientRead:
    try:
        return PatientRead.model_validate(svc.update_patient(db, patient_id, payload))
    except svc.PatientNotFound as e:
        raise HTTPException(status_code=404, detail="Patient not found") from e


@router.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> None:
    try:
        svc.delete_patient(db, patient_id)
    except svc.PatientNotFound as e:
        raise HTTPException(status_code=404, detail="Patient not found") from e
```

### Step 3.3 — Mount router

In `apps/api/app/main.py`, add:

```python
from app.routers import patients as patients_router

# inside create_app:
app.include_router(patients_router.router, prefix="/api/v1")
```

### Step 3.4 — `apps/api/tests/test_patients.py`

```python
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from testcontainers.postgres import PostgresContainer

from app.db import Base, get_db
from app.main import create_app


@pytest.fixture(scope="module")
def pg():
    with PostgresContainer("postgres:16-alpine") as p:
        yield p


@pytest.fixture
def client(pg):
    url = pg.get_connection_url().replace("postgresql://", "postgresql+psycopg://")
    engine = create_engine(url)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, expire_on_commit=False)

    app = create_app()
    app.dependency_overrides[get_db] = lambda: Session()
    return TestClient(app)


def _new_payload(**over) -> dict:
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
    r = client.post("/api/v1/patients", json=_new_payload())
    assert r.status_code == 201
    pid = r.json()["id"]

    r2 = client.get(f"/api/v1/patients/{pid}")
    assert r2.status_code == 200
    assert r2.json()["mrn"].startswith("MRN-")


def test_validation_422(client) -> None:
    bad = _new_payload(phone="oops")
    r = client.post("/api/v1/patients", json=bad)
    assert r.status_code == 422


def test_list_pagination(client) -> None:
    for i in range(25):
        client.post("/api/v1/patients", json=_new_payload(first_name=f"P{i}"))
    r = client.get("/api/v1/patients?page=2&page_size=10")
    body = r.json()
    assert body["page"] == 2
    assert len(body["items"]) == 10
    assert body["total"] >= 25


def test_search_filters(client) -> None:
    client.post("/api/v1/patients", json=_new_payload(first_name="Unique", last_name="Name"))
    r = client.get("/api/v1/patients?search=unique")
    assert any(p["first_name"] == "Unique" for p in r.json()["items"])


def test_sort_whitelist_400(client) -> None:
    r = client.get("/api/v1/patients?sort=nonsense")
    # Pydantic accepts the string but the service rejects it; either 422 or 400 acceptable.
    assert r.status_code in (400, 422)


def test_delete_204_then_404(client) -> None:
    r = client.post("/api/v1/patients", json=_new_payload())
    pid = r.json()["id"]
    r2 = client.delete(f"/api/v1/patients/{pid}")
    assert r2.status_code == 204
    r3 = client.get(f"/api/v1/patients/{pid}")
    assert r3.status_code == 404
```

Run: `uv run pytest tests/test_patients.py -v` (requires Docker).

---

## Phase 4 — Notes + Summarizer

**Files created/modified:**
- `apps/api/app/services/notes.py`
- `apps/api/app/services/summarizer/__init__.py`
- `apps/api/app/services/summarizer/base.py`
- `apps/api/app/services/summarizer/template.py`
- `apps/api/app/services/summarizer/claude.py`
- `apps/api/app/routers/notes.py`
- `apps/api/app/routers/summary.py`
- `apps/api/app/main.py` (mount routers + summarizer dependency)
- `apps/api/tests/test_notes.py`
- `apps/api/tests/test_summary.py`

### Step 4.1 — Notes service

`apps/api/app/services/notes.py`:

```python
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import Note, Patient
from app.schemas.note import NoteCreate
from app.services.patients import PatientNotFound, get_patient


class NoteNotFound(Exception):
    pass


def list_notes(db: Session, patient_id: uuid.UUID) -> list[Note]:
    get_patient(db, patient_id)
    return list(
        db.query(Note).filter(Note.patient_id == patient_id).order_by(Note.created_at.desc())
    )


def create_note(db: Session, patient_id: uuid.UUID, payload: NoteCreate) -> Note:
    patient = get_patient(db, patient_id)
    created_at = payload.created_at or datetime.now(timezone.utc)
    note = Note(
        patient_id=patient.id,
        content=payload.content,
        author=payload.author,
        created_at=created_at,
    )
    db.add(note)
    if patient.last_visit_at is None or created_at > patient.last_visit_at:
        patient.last_visit_at = created_at
    db.commit()
    db.refresh(note)
    return note


def delete_note(db: Session, patient_id: uuid.UUID, note_id: uuid.UUID) -> None:
    get_patient(db, patient_id)
    note = db.query(Note).filter(Note.id == note_id, Note.patient_id == patient_id).first()
    if not note:
        raise NoteNotFound(str(note_id))
    db.delete(note)
    db.commit()
```

### Step 4.2 — Notes router

`apps/api/app/routers/notes.py`:

```python
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.note import NoteCreate, NoteRead
from app.services import notes as svc
from app.services.patients import PatientNotFound

router = APIRouter(prefix="/patients/{patient_id}/notes", tags=["notes"])


@router.get("", response_model=list[NoteRead])
def list_notes(patient_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]) -> list[NoteRead]:
    try:
        return [NoteRead.model_validate(n) for n in svc.list_notes(db, patient_id)]
    except PatientNotFound as e:
        raise HTTPException(404, "Patient not found") from e


@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
def create_note(
    patient_id: uuid.UUID, payload: NoteCreate, db: Annotated[Session, Depends(get_db)]
) -> NoteRead:
    try:
        return NoteRead.model_validate(svc.create_note(db, patient_id, payload))
    except PatientNotFound as e:
        raise HTTPException(404, "Patient not found") from e


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    patient_id: uuid.UUID, note_id: uuid.UUID, db: Annotated[Session, Depends(get_db)]
) -> None:
    try:
        svc.delete_note(db, patient_id, note_id)
    except svc.NoteNotFound as e:
        raise HTTPException(404, "Note not found") from e
    except PatientNotFound as e:
        raise HTTPException(404, "Patient not found") from e
```

### Step 4.3 — Summarizer interface

`apps/api/app/services/summarizer/base.py`:

```python
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.models import Note, Patient


@dataclass
class SummaryResult:
    summary: str
    source: str  # "template" | "claude"
    note_count: int


class Summarizer(ABC):
    @abstractmethod
    def summarize(self, patient: Patient, notes: list[Note]) -> SummaryResult:
        ...
```

### Step 4.4 — Template summarizer

`apps/api/app/services/summarizer/template.py`:

```python
from __future__ import annotations

from datetime import date

from app.models import Note, Patient
from app.services.summarizer.base import SummaryResult, Summarizer


def _age(dob: date) -> int:
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


class TemplateSummarizer(Summarizer):
    def summarize(self, patient: Patient, notes: list[Note]) -> SummaryResult:
        age = _age(patient.date_of_birth)
        conds = ", ".join(patient.conditions) if patient.conditions else "none recorded"
        allergies = ", ".join(patient.allergies) if patient.allergies else "none recorded"
        n = len(notes)
        if notes:
            latest = max(notes, key=lambda x: x.created_at)
            recent = (
                f"{n} clinical note{'s' if n != 1 else ''} on record; the most recent "
                f"({latest.created_at:%b %d, %Y}) reads: \"{latest.content[:180]}\""
            )
        else:
            recent = "No clinical notes on record yet."

        summary = (
            f"{patient.first_name} {patient.last_name} is a {age}-year-old, "
            f"blood type {patient.blood_type}. Status: {patient.status}. "
            f"Active conditions: {conds}. Allergies: {allergies}. {recent}"
        )
        return SummaryResult(summary=summary, source="template", note_count=n)
```

### Step 4.5 — Claude summarizer

`apps/api/app/services/summarizer/claude.py`:

```python
from __future__ import annotations

import logging

from anthropic import Anthropic, APITimeoutError

from app.models import Note, Patient
from app.services.summarizer.base import SummaryResult, Summarizer
from app.services.summarizer.template import TemplateSummarizer

log = logging.getLogger(__name__)

SYSTEM = (
    "You are a careful clinical assistant. Given a patient profile and their notes, "
    "produce a 2-4 sentence narrative summary. Use plain, professional prose. "
    "Mention identifiers (name, age, blood type), conditions, allergies, and a "
    "concise interpretation of the most recent activity. Never invent facts."
)


class ClaudeSummarizer(Summarizer):
    def __init__(self, api_key: str, fallback: TemplateSummarizer) -> None:
        self._client = Anthropic(api_key=api_key, timeout=8.0)
        self._fallback = fallback

    def summarize(self, patient: Patient, notes: list[Note]) -> SummaryResult:
        try:
            content = self._build_user_prompt(patient, notes)
            resp = self._client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=250,
                system=SYSTEM,
                messages=[{"role": "user", "content": content}],
            )
            text = "".join(b.text for b in resp.content if hasattr(b, "text"))
            return SummaryResult(summary=text.strip(), source="claude", note_count=len(notes))
        except (APITimeoutError, Exception) as e:  # noqa: BLE001
            log.warning("Claude summarizer failed (%s); falling back to template.", e)
            return self._fallback.summarize(patient, notes)

    @staticmethod
    def _build_user_prompt(patient: Patient, notes: list[Note]) -> str:
        sorted_notes = sorted(notes, key=lambda n: n.created_at, reverse=True)
        lines = [
            f"Patient: {patient.first_name} {patient.last_name}",
            f"DOB: {patient.date_of_birth.isoformat()}",
            f"Blood type: {patient.blood_type}",
            f"Status: {patient.status}",
            f"Conditions: {', '.join(patient.conditions) or 'none'}",
            f"Allergies: {', '.join(patient.allergies) or 'none'}",
            "",
            "Notes (newest first):",
        ]
        for n in sorted_notes:
            lines.append(f"- {n.created_at:%Y-%m-%d}: {n.content} — {n.author}")
        return "\n".join(lines)
```

### Step 4.6 — Summarizer factory

`apps/api/app/services/summarizer/__init__.py`:

```python
from __future__ import annotations

from app.services.summarizer.base import SummaryResult, Summarizer
from app.services.summarizer.claude import ClaudeSummarizer
from app.services.summarizer.template import TemplateSummarizer
from app.settings import get_settings


def build_summarizer() -> Summarizer:
    settings = get_settings()
    template = TemplateSummarizer()
    if settings.anthropic_api_key:
        return ClaudeSummarizer(settings.anthropic_api_key, template)
    return template


__all__ = ["SummaryResult", "Summarizer", "build_summarizer"]
```

### Step 4.7 — Summary router

`apps/api/app/routers/summary.py`:

```python
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.notes import list_notes
from app.services.patients import PatientNotFound, get_patient
from app.services.summarizer import Summarizer, build_summarizer

router = APIRouter(prefix="/patients/{patient_id}/summary", tags=["summary"])


def get_summarizer() -> Summarizer:
    return build_summarizer()


class SummaryResponse(BaseModel):
    summary: str
    source: str
    note_count: int


@router.get("", response_model=SummaryResponse)
def get_summary(
    patient_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    summarizer: Annotated[Summarizer, Depends(get_summarizer)],
) -> SummaryResponse:
    try:
        patient = get_patient(db, patient_id)
    except PatientNotFound as e:
        raise HTTPException(404, "Patient not found") from e
    notes = list_notes(db, patient_id)
    result = summarizer.summarize(patient, notes)
    return SummaryResponse(**result.__dict__)
```

### Step 4.8 — Mount routers

In `apps/api/app/main.py` add:

```python
from app.routers import notes as notes_router
from app.routers import summary as summary_router

# inside create_app, after patients router:
app.include_router(notes_router.router, prefix="/api/v1")
app.include_router(summary_router.router, prefix="/api/v1")
```

### Step 4.9 — Notes tests

`apps/api/tests/test_notes.py`:

```python
def test_add_then_list(client) -> None:
    p = client.post("/api/v1/patients", json={
        "first_name": "Note", "last_name": "Owner", "date_of_birth": "1980-01-01",
        "phone": "+14155551111", "blood_type": "O+", "status": "active",
        "conditions": [], "allergies": [],
    }).json()
    pid = p["id"]

    r = client.post(f"/api/v1/patients/{pid}/notes", json={
        "content": "Initial note", "author": "Dr. Test",
    })
    assert r.status_code == 201

    r2 = client.get(f"/api/v1/patients/{pid}/notes")
    assert r2.status_code == 200
    assert len(r2.json()) == 1


def test_delete_note(client) -> None:
    p = client.post("/api/v1/patients", json={
        "first_name": "Del", "last_name": "Note", "date_of_birth": "1980-01-01",
        "phone": "+14155552222", "blood_type": "O+", "status": "active",
        "conditions": [], "allergies": [],
    }).json()
    pid = p["id"]
    n = client.post(f"/api/v1/patients/{pid}/notes", json={
        "content": "Bye", "author": "Dr. Test",
    }).json()
    r = client.delete(f"/api/v1/patients/{pid}/notes/{n['id']}")
    assert r.status_code == 204
```

(Reuses `client` fixture from `test_patients.py` — move it to `conftest.py` if you want to share.)

### Step 4.10 — Summary test (template)

`apps/api/tests/test_summary.py`:

```python
from datetime import date, datetime, timezone

from app.models import Note, Patient
from app.services.summarizer.template import TemplateSummarizer


def test_template_summary_includes_basics() -> None:
    p = Patient(
        first_name="Test", last_name="User",
        date_of_birth=date(1980, 1, 1),
        phone="+1", blood_type="O+", status="active",
        conditions=["Hypertension"], allergies=["Sulfa"],
    )
    note = Note(content="Doing well", author="Dr. A", created_at=datetime(2026, 5, 1, tzinfo=timezone.utc))
    result = TemplateSummarizer().summarize(p, [note])
    assert "Test User" in result.summary
    assert "Hypertension" in result.summary
    assert "Sulfa" in result.summary
    assert "Doing well" in result.summary
    assert result.source == "template"
    assert result.note_count == 1
```

### Step 4.11 — Verify

```bash
docker compose up --build
curl -s http://localhost:8000/api/v1/patients?page_size=2 | jq '.items[0].id'
# Take a UUID, then:
PID=<paste>
curl -s http://localhost:8000/api/v1/patients/$PID/notes
curl -s http://localhost:8000/api/v1/patients/$PID/summary | jq
```

Expected: notes array (seeded) and a coherent template summary with `"source": "template"`.

---

## Phase 5 — Frontend foundation

**Goal:** Vite + React + Tailwind + shadcn-style primitives running. Theme toggle works. Router has placeholders for all four routes. No data yet.

**Files created:**
- `apps/web/package.json`
- `apps/web/tsconfig.json`
- `apps/web/tsconfig.node.json`
- `apps/web/vite.config.ts`
- `apps/web/tailwind.config.ts`
- `apps/web/postcss.config.js`
- `apps/web/index.html`
- `apps/web/.eslintrc.cjs`
- `apps/web/.prettierrc`
- `apps/web/Dockerfile`
- `apps/web/nginx.conf`
- `apps/web/src/main.tsx`
- `apps/web/src/index.css`
- `apps/web/src/app/router.tsx`
- `apps/web/src/app/providers.tsx`
- `apps/web/src/app/layout/AppShell.tsx`
- `apps/web/src/app/layout/Sidebar.tsx`
- `apps/web/src/app/layout/Topbar.tsx`
- `apps/web/src/lib/theme.ts`
- `apps/web/src/lib/format.ts`
- `apps/web/src/components/ui/button.tsx`
- `apps/web/src/components/ui/input.tsx`
- `apps/web/src/components/ui/select.tsx`
- `apps/web/src/features/dashboard/routes/DashboardPage.tsx`
- `apps/web/src/features/patients/routes/PatientListPage.tsx`
- `apps/web/src/features/patients/routes/PatientDetailPage.tsx`
- `apps/web/src/features/patients/routes/PatientNewPage.tsx`
- `apps/web/src/app/routes/NotFoundPage.tsx`

### Step 5.1 — Scaffold

```bash
cd apps/web
pnpm create vite@latest . --template react-ts
pnpm add react-router-dom @tanstack/react-query zustand react-hook-form zod \
  @hookform/resolvers @tanstack/react-virtual lucide-react clsx tailwind-merge
pnpm add -D tailwindcss postcss autoprefixer prettier eslint eslint-plugin-react-hooks \
  @typescript-eslint/eslint-plugin @typescript-eslint/parser openapi-typescript vitest \
  @testing-library/react @testing-library/jest-dom jsdom @types/node
pnpm tailwindcss init -p
```

Wipe the Vite boilerplate (`src/App.tsx`, `src/App.css`) — we replace it.

### Step 5.2 — Tailwind config

`apps/web/tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", "[data-theme='dark']"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ['"Instrument Serif"', "Iowan Old Style", "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        bg: "var(--bg)",
        "bg-elev": "var(--bg-elev)",
        "bg-subtle": "var(--bg-subtle)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        fg: "var(--text)",
        "fg-muted": "var(--text-muted)",
        "fg-subtle": "var(--text-subtle)",
        accent: "var(--accent)",
        "accent-bg": "var(--accent-bg)",
        "accent-fg": "var(--accent-fg)",
        danger: "var(--danger)",
        ok: "var(--ok)",
        "ok-bg": "var(--ok-bg)",
        warn: "var(--warn)",
        "warn-bg": "var(--warn-bg)",
      },
    },
  },
} satisfies Config;
```

### Step 5.3 — Global styles

`apps/web/src/index.css`:

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap");

@tailwind base;
@tailwind components;
@tailwind utilities;

:root[data-theme="light"] {
  --bg: #fafaf9;
  --bg-elev: #ffffff;
  --bg-subtle: #f4f4f2;
  --border: #e7e5e1;
  --border-strong: #d6d3cd;
  --text: #18181b;
  --text-muted: #71717a;
  --text-subtle: #a1a1aa;
  --accent: #0d9488;
  --accent-bg: #ccfbf1;
  --accent-fg: #115e59;
  --danger: #b91c1c;
  --warn: #b45309;
  --warn-bg: #fef3c7;
  --ok: #047857;
  --ok-bg: #d1fae5;
}

:root[data-theme="dark"] {
  --bg: #0a0a0a;
  --bg-elev: #111111;
  --bg-subtle: #161616;
  --border: #232323;
  --border-strong: #2e2e2e;
  --text: #f4f4f5;
  --text-muted: #a1a1aa;
  --text-subtle: #71717a;
  --accent: #2dd4bf;
  --accent-bg: #042f2e;
  --accent-fg: #5eead4;
  --danger: #f87171;
  --warn: #fbbf24;
  --warn-bg: #422006;
  --ok: #34d399;
  --ok-bg: #052e16;
}

html, body, #root { height: 100%; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: theme("fontFamily.sans");
  -webkit-font-smoothing: antialiased;
  font-feature-settings: "cv02","cv03","cv04","cv11";
}
```

### Step 5.4 — Theme store

`apps/web/src/lib/theme.ts`:

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark";

type State = { theme: Theme; toggle: () => void; set: (t: Theme) => void };

export const useTheme = create<State>()(
  persist(
    (set, get) => ({
      theme: typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
      toggle: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      set: (theme) => set({ theme }),
    }),
    { name: "ascertain-theme" },
  ),
);

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}
```

### Step 5.5 — Providers

`apps/web/src/app/providers.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";

import { applyTheme, useTheme } from "@/lib/theme";
import { router } from "@/app/router";

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export function Providers() {
  const theme = useTheme((s) => s.theme);
  useEffect(() => applyTheme(theme), [theme]);
  return (
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
```

### Step 5.6 — Path alias

`apps/web/tsconfig.json` add `"paths": { "@/*": ["src/*"] }` and `apps/web/vite.config.ts`:

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { host: true, port: 5173 },
});
```

### Step 5.7 — Router

`apps/web/src/app/router.tsx`:

```tsx
import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";

import { AppShell } from "@/app/layout/AppShell";

const Dashboard = lazy(() => import("@/features/dashboard/routes/DashboardPage"));
const PatientList = lazy(() => import("@/features/patients/routes/PatientListPage"));
const PatientDetail = lazy(() => import("@/features/patients/routes/PatientDetailPage"));
const PatientNew = lazy(() => import("@/features/patients/routes/PatientNewPage"));
const NotFound = lazy(() => import("@/app/routes/NotFoundPage"));

const wrap = (el: JSX.Element) => <Suspense fallback={<div className="p-8 text-fg-muted">Loading…</div>}>{el}</Suspense>;

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: wrap(<Dashboard />) },
      { path: "/patients", element: wrap(<PatientList />) },
      { path: "/patients/new", element: wrap(<PatientNew />) },
      { path: "/patients/:id", element: wrap(<PatientDetail />) },
      { path: "/patients/:id/edit", element: wrap(<PatientNew />) },
      { path: "*", element: wrap(<NotFound />) },
    ],
  },
]);
```

### Step 5.8 — Layout shell

`apps/web/src/app/layout/AppShell.tsx`:

```tsx
import { Outlet } from "react-router-dom";

import { Sidebar } from "@/app/layout/Sidebar";
import { Topbar } from "@/app/layout/Topbar";

export function AppShell() {
  return (
    <div className="grid h-full grid-cols-[232px_1fr]">
      <Sidebar />
      <div className="flex min-w-0 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}
```

(Sidebar + Topbar follow the markup from the mockup. Keep the components small.)

### Step 5.9 — Topbar `Sidebar` and `Topbar` content

Port directly from the mockup HTML. Sidebar contains the theme toggle button calling `useTheme().toggle()`.

### Step 5.10 — Placeholder route pages

Each file exports a default component returning a stub like:

```tsx
export default function PatientListPage() {
  return <div className="p-8 font-serif text-3xl italic">Patients · coming next.</div>;
}
```

This unblocks the router so you can navigate.

### Step 5.11 — `apps/web/Dockerfile`

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

FROM deps AS build
COPY . .
RUN pnpm build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/ >/dev/null || exit 1
```

`apps/web/nginx.conf`:

```nginx
server {
  listen 80;
  location / {
    root /usr/share/nginx/html;
    try_files $uri /index.html;
  }
}
```

### Step 5.12 — Compose `web` service

Add to `docker-compose.yml`:

```yaml
  web:
    build: ./apps/web
    environment:
      VITE_API_URL: ${VITE_API_URL}
    ports:
      - "5173:80"
    depends_on:
      api:
        condition: service_started
    develop:
      watch:
        - action: sync
          path: ./apps/web/src
          target: /app/src
        - action: rebuild
          path: ./apps/web/package.json
```

For true hot-reload locally, devs run `pnpm dev` outside compose pointed at the dockerized API — the Dockerfile here is for production-style serving. The dev story is documented in `manual.md`.

### Step 5.13 — Verify

```bash
cd apps/web && pnpm dev
# Visit http://localhost:5173 → see the shell with sidebar + theme toggle works.
```

---

## Phase 6 — OpenAPI codegen + typed API client

**Files created:**
- `apps/web/src/lib/api/client.ts`
- `apps/web/src/lib/api/schema.ts` (generated, gitignored)
- `apps/web/scripts/generate-types.sh`

### Step 6.1 — Generate types

```bash
# api must be running on :8000
pnpm exec openapi-typescript http://localhost:8000/api/v1/openapi.json -o src/lib/api/schema.ts
```

Wrap that in `apps/web/scripts/generate-types.sh` and add a `pnpm api:types` script.

### Step 6.2 — Typed fetch wrapper

`apps/web/src/lib/api/client.ts`:

```ts
import type { paths } from "@/lib/api/schema";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

type HasGet<P> = P extends { get: any } ? P["get"]["responses"]["200"]["content"]["application/json"] : never;

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let detail: unknown;
    try { detail = await res.json(); } catch { detail = await res.text(); }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export class ApiError extends Error {
  constructor(public status: number, public payload: unknown) {
    super(`API ${status}`);
  }
}

export type Patient = paths["/patients/{patient_id}"]["get"]["responses"]["200"]["content"]["application/json"];
export type PatientPage = paths["/patients"]["get"]["responses"]["200"]["content"]["application/json"];
export type Note = paths["/patients/{patient_id}/notes"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type Summary = paths["/patients/{patient_id}/summary"]["get"]["responses"]["200"]["content"]["application/json"];
```

---

## Phase 7 — Patients feature (list, detail, notes, summary)

**Files created:**
- `apps/web/src/features/patients/api.ts`
- `apps/web/src/features/patients/schema.ts`
- `apps/web/src/features/patients/components/StatusPill.tsx`
- `apps/web/src/features/patients/components/PatientTable.tsx`
- `apps/web/src/features/patients/components/FilterRow.tsx`
- `apps/web/src/features/patients/components/Pager.tsx`
- `apps/web/src/features/patients/routes/PatientListPage.tsx` (real)
- `apps/web/src/features/patients/routes/PatientDetailPage.tsx` (real)
- `apps/web/src/features/notes/components/NotesList.tsx`
- `apps/web/src/features/notes/components/NoteComposer.tsx`
- `apps/web/src/features/patients/components/SummaryPanel.tsx`

### Step 7.1 — Hooks

`apps/web/src/features/patients/api.ts`:

```ts
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type Note, type Patient, type PatientPage, type Summary } from "@/lib/api/client";

export type ListParams = {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  sort?: "last_visit_at" | "name" | "created_at";
  order?: "asc" | "desc";
};

export function usePatients(params: ListParams) {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page));
  qs.set("page_size", String(params.pageSize));
  if (params.search) qs.set("search", params.search);
  if (params.status) qs.set("status", params.status);
  if (params.sort) qs.set("sort", params.sort);
  if (params.order) qs.set("order", params.order);

  return useQuery<PatientPage>({
    queryKey: ["patients", params],
    queryFn: () => api(`/patients?${qs.toString()}`),
    placeholderData: keepPreviousData,
  });
}

export function usePatient(id: string | undefined) {
  return useQuery<Patient>({
    queryKey: ["patient", id],
    queryFn: () => api(`/patients/${id}`),
    enabled: !!id,
  });
}

export function useNotes(id: string | undefined) {
  return useQuery<Note[]>({
    queryKey: ["notes", id],
    queryFn: () => api(`/patients/${id}/notes`),
    enabled: !!id,
  });
}

export function useSummary(id: string | undefined) {
  return useQuery<Summary>({
    queryKey: ["summary", id],
    queryFn: () => api(`/patients/${id}/summary`),
    enabled: !!id,
  });
}

export function useAddNote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { content: string; author: string }) =>
      api<Note>(`/patients/${id}/notes`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", id] });
      qc.invalidateQueries({ queryKey: ["summary", id] });
      qc.invalidateQueries({ queryKey: ["patient", id] });
    },
  });
}

export function useDeleteNote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) =>
      api<void>(`/patients/${id}/notes/${noteId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes", id] });
      qc.invalidateQueries({ queryKey: ["summary", id] });
    },
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/patients/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }),
  });
}
```

### Step 7.2 — Components

Port the corresponding sections from the mockup. Each component is < 120 lines and pure:

- `StatusPill` — accepts `status`, returns colored pill (active/follow-up/inactive).
- `PatientTable` — accepts rows + onClick handler. Sortable column headers call a passed callback.
- `FilterRow` — controlled inputs that emit a `params` object on change.
- `Pager` — pagination footer; emits `onPageChange`.
- `NotesList` — chronological notes with delete buttons.
- `NoteComposer` — textarea + submit; uses `useAddNote`.
- `SummaryPanel` — shows summary + `source` badge; skeleton while loading.

### Step 7.3 — Pages

`PatientListPage`:
- Reads `?page=&search=&status=&sort=&order=` from URL via `useSearchParams`.
- Debounces `search` (250ms) before pushing it back to the URL.
- Renders `FilterRow → PatientTable → Pager`.
- Conditional `PatientTable` virtualized variant when current-page row count > 50 (split into `PatientTable.tsx` and `PatientTableVirtual.tsx`, chosen by a wrapper).

`PatientDetailPage`:
- Three queries in parallel.
- Top section: header with serif name; right side has Edit + Delete (delete is a confirm dialog).
- Left column: `SummaryPanel` → `NotesList` → `NoteComposer`.
- Right rail: identifier + clinical + danger-zone cards (chips for conditions/allergies).

### Step 7.4 — Tests

`apps/web/src/features/patients/components/PatientTable.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";

import { PatientTable } from "./PatientTable";

const rows = [{ id: "1", first_name: "M", last_name: "O", age: 54, mrn: "MRN-AAAAA", blood_type: "O+", status: "active", last_visit_at: null, conditions: [], allergies: [] } as any];

test("renders rows", () => {
  render(<PatientTable rows={rows} onRowClick={() => {}} />);
  expect(screen.getByText("MRN-AAAAA")).toBeInTheDocument();
});
```

Repeat for `StatusPill`, `Pager`.

### Step 7.5 — Verify

`pnpm dev`, navigate to `/patients`, see 20 seeded patients. Filter by status, search, paginate. Click a row → detail page with notes + summary visible.

---

## Phase 8 — Patient form (create + edit)

**Files created:**
- `apps/web/src/features/patients/schema.ts`
- `apps/web/src/features/patients/components/PatientForm.tsx`
- `apps/web/src/features/patients/routes/PatientNewPage.tsx` (real)
- `apps/web/src/features/patients/routes/PatientEditPage.tsx` (optionally separate, or reuse)
- `apps/web/src/features/patients/api.ts` (add `useCreatePatient`, `useUpdatePatient`)
- `apps/web/src/features/patients/components/PatientForm.test.tsx`

### Step 8.1 — Zod schema

`apps/web/src/features/patients/schema.ts`:

```ts
import { z } from "zod";

const phoneRe = /^\+?[0-9 .()\-]{7,20}$/;

export const patientSchema = z.object({
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
  date_of_birth: z.string().refine((s) => !!s && new Date(s) < new Date(), "Must be in the past."),
  phone: z.string().regex(phoneRe, "Looks like an invalid phone number."),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().max(240).optional().or(z.literal("")),
  blood_type: z.enum(["O+","O-","A+","A-","B+","B-","AB+","AB-"]),
  status: z.enum(["active","follow_up","inactive"]).default("active"),
  conditions: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
});

export type PatientFormValues = z.infer<typeof patientSchema>;
```

### Step 8.2 — Form component

`apps/web/src/features/patients/components/PatientForm.tsx`:

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { ApiError } from "@/lib/api/client";
import { patientSchema, type PatientFormValues } from "@/features/patients/schema";

type Props = {
  initial?: Partial<PatientFormValues>;
  onSubmit: (values: PatientFormValues) => Promise<void>;
  submitLabel?: string;
};

export function PatientForm({ initial, onSubmit, submitLabel = "Create patient" }: Props) {
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: { conditions: [], allergies: [], status: "active", ...initial },
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        const errs = (e.payload as any)?.detail ?? [];
        for (const err of errs) {
          const field = err.loc?.[err.loc.length - 1];
          if (field) form.setError(field, { type: "server", message: err.msg });
        }
        return;
      }
      form.setError("root.network", { type: "network", message: "Network error — please retry." });
    }
  });

  // Render markup mirroring the mockup form section (Personal + Medical).
  // Each field reads `form.register("field")` and renders form.formState.errors[field].
  // ...JSX omitted here for brevity but follows the mockup exactly...
  return <form onSubmit={submit}>{/* fields */}</form>;
}
```

(The JSX itself is straightforward Tailwind ports of the mockup form sections.)

### Step 8.3 — Routes

`PatientNewPage` (also used for edit when `id` param present):

```tsx
import { useNavigate, useParams } from "react-router-dom";

import { PatientForm } from "@/features/patients/components/PatientForm";
import {
  useCreatePatient,
  usePatient,
  useUpdatePatient,
} from "@/features/patients/api";

export default function PatientNewPage() {
  const { id } = useParams();
  const editing = !!id;
  const { data } = usePatient(id);
  const create = useCreatePatient();
  const update = useUpdatePatient();
  const nav = useNavigate();

  if (editing && !data) return null;

  return (
    <PatientForm
      initial={data}
      submitLabel={editing ? "Save changes" : "Create patient"}
      onSubmit={async (values) => {
        const patient = editing
          ? await update.mutateAsync({ id: id!, body: values })
          : await create.mutateAsync(values);
        nav(`/patients/${patient.id}`);
      }}
    />
  );
}
```

### Step 8.4 — Tests

Two RTL tests:
- Submitting an empty form shows required-field messages.
- Server 422 response is mapped to the right field.

### Step 8.5 — Verify

Create a new patient end-to-end; edit an existing one; submit a deliberately bad phone to see both client + server validation paths.

---

## Phase 9 — Dashboard home + 404 + polish

### Step 9.1 — Dashboard home
- Render the stats row + activity bar chart + recent activity feed from the mockup.
- Stats fetched via aggregate query: `useQuery(['stats'], () => api('/patients?page_size=1&status=active'))` etc. (Three lightweight queries.)
- Activity feed is the 10 most recent notes — add `GET /notes?recent=10` endpoint to backend (one-liner that joins patients).

### Step 9.2 — 404
- Port the markup directly. Buttons link to `/patients` and `/`.

### Step 9.3 — Polish pass
- Confirm Suspense fallbacks are non-jarring (use skeletons, not plain text).
- Confirm hot-reload works via `pnpm dev` against dockerized API.
- Add an `ErrorBoundary` at the route shell level.
- Confirm `pnpm build` succeeds with no TS errors.

---

## Phase 10 — Virtualization, theme persistence, code splitting verification

### Step 10.1 — Virtualization threshold
- Add `PatientTableVirtual.tsx` using `useVirtualizer({ count, estimateSize: () => 56 })`.
- Wrap with a chooser `PatientTable` that switches based on a `VIRTUALIZATION_THRESHOLD = 50` constant.

### Step 10.2 — Theme persistence
- Confirm `localStorage` round-trip works (already provided by Zustand persist).
- Honor `prefers-color-scheme` on first visit only — don't override after user picks a theme.

### Step 10.3 — Code splitting
- Run `pnpm build` and inspect `dist/assets/`. Confirm each route is a separate chunk.
- Add an ADR if any route weighs more than 200KB gzipped.

---

## Phase 11 — Tests, CI, ADRs, diagrams, manual

### Step 11.1 — Backend test run config

`apps/api/pyproject.toml` already configured. Verify:

```bash
cd apps/api
uv run pytest -v
# All tests pass (testcontainers required).
```

### Step 11.2 — Frontend test config

`apps/web/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"], globals: true },
});
```

`apps/web/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Run: `pnpm test` and confirm all tests pass.

### Step 11.3 — CI

`.github/workflows/ci.yml`:

```yaml
name: ci
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
jobs:
  api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - working-directory: apps/api
        run: |
          uv sync
          uv run ruff check .
          uv run pytest -v
  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm, cache-dependency-path: apps/web/pnpm-lock.yaml }
      - working-directory: apps/web
        run: |
          pnpm install --frozen-lockfile
          pnpm exec eslint .
          pnpm exec tsc --noEmit
          pnpm test
          pnpm build
```

### Step 11.4 — ADRs

Write to `docs/adr/`:

- `0001-monorepo-layout.md`
- `0002-state-management.md`
- `0003-api-typing.md`
- `0004-summarizer-strategy.md`
- `0005-k8s-parity-without-tilt.md`
- `0006-migrations-and-seeding.md`
- `0007-virtualization-threshold.md`

Each ADR is 3 short sections: **Context · Decision · Consequences**, ≤ 200 words.

### Step 11.5 — HLD diagram

`docs/diagrams/architecture.md` with two Mermaid diagrams:

1. **Container diagram** — `Browser → web (nginx) → api (FastAPI) → db (Postgres)`, with the optional Claude API edge dashed.
2. **Request sequence** for `GET /patients/{id}/summary` showing the pluggable summarizer.

### Step 11.6 — Manual

`docs/manual.md`:

- **For developers:** prerequisites, `cp .env.example .env`, `docker compose up`, hot-reload story, running tests, regenerating API types.
- **For clinicians (mock):** how to navigate the dashboard, search, add a note, read the summary.

### Step 11.7 — Final README

Rewrite `README.md`:

- One-paragraph elevator pitch.
- Quickstart (3 commands).
- Architecture summary (link to HLD).
- "Why these choices" (link to ADRs).
- Where to find docs (specs, manual, K8s).
- Known gaps (no auth, no E2E, last-write-wins).

### Step 11.8 — K8s parity manifests

`k8s/` folder per spec. `k8s/README.md` explains the Compose ↔ K8s mapping and points to ADR-0005.

### Step 11.9 — Final verification checklist

- [ ] `docker compose down -v && docker compose up --build` boots cleanly.
- [ ] `curl localhost:8000/api/v1/health` → `{"status":"ok"}`.
- [ ] Visit `http://localhost:5173`, see 20 patients.
- [ ] Create, edit, delete a patient.
- [ ] Add and delete a note. Summary panel refreshes.
- [ ] Toggle theme persists across reload.
- [ ] Search debounce, status filter, sort, and pagination all update the URL.
- [ ] `cd apps/api && uv run pytest -v` → all green.
- [ ] `cd apps/web && pnpm test && pnpm build` → all green.
- [ ] CI workflow YAML is syntactically valid (`act` optional).
- [ ] All ADRs + HLD + manual exist and link from README.
- [ ] `k8s/README.md` reflects the actual Compose topology.

---

## Definition of done

- `docker compose up` boots the stack in under 2 minutes on a clean machine.
- All five take-home parts demonstrably work in the UI.
- All curated stretch goals (Alembic, sort/filter, virtualization, theme, tests, CI) are implemented and visible in the diff.
- README, ADRs, HLD, manual, and K8s parity docs all exist and are accurate.
- No regressions on the verification checklist above.
