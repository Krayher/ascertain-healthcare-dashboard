# ADR 0006 · Alembic for migrations, idempotent Python seed script

**Status:** Accepted · 2026-05-14

## Context

The brief says "migrations or init scripts" and lists Alembic in the
stretch goals. Two choices:

1. **Raw SQL `init.sql`** mounted into the Postgres container. Simple, no
   Python dependency for schema setup, but offers no upgrade path. The
   second time you change the schema, you either nuke the database or write
   ad-hoc migration scripts by hand.
2. **Alembic.** Tracks revisions, supports forward and backward migrations,
   has an autogenerate workflow that diffs SQLAlchemy models against the
   live DB.

For seeding (separate concern), the options are:

- A second `.sql` file mounted alongside `init.sql`.
- A Python script that uses the same SQLAlchemy models.

## Decision

- **Migrations:** Alembic. Configured via `alembic.ini` + `alembic/env.py`
  pointing at `Base.metadata`. Two revisions ship today:
  `2fb31339405c` (empty initial) and `461c2be277df` (patients + notes +
  composite index `(last_name, first_name)`).
- **Seeding:** Python script (`app/seed.py`) that uses SQLAlchemy. It is
  **idempotent** — it counts existing patients first and exits if at or
  above the target count, and within a partial seed it checks each patient
  by `(first_name, last_name)` before inserting.

Both run inside a single one-shot `migrate` Compose service:

```yaml
command: ["sh", "-c", "alembic upgrade head && python -m app.seed"]
```

The `api` service waits on `migrate` via
`condition: service_completed_successfully`.

## Consequences

- Adding a column means: edit the SQLAlchemy model →
  `alembic revision --autogenerate -m "..."` → review → commit.
- Restarting the stack does not re-seed (idempotent), but `docker compose
  down -v` (volumes wiped) starts clean.
- The seed uses a fixed RNG seed (`20260514`) so notes are reproducible
  across machines.

## Alternatives considered

- **Raw SQL init script:** rejected — no migration path.
- **SQLModel:** considered briefly. Adds a dependency, blurs the line
  between ORM model and Pydantic schema. Keeping them separate is cleaner.
