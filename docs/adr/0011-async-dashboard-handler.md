# ADR 0011 · Async DB session for the dashboard handler

**Status:** Accepted · 2026-05-19
**Supersedes (partially):** ADR-0002 §sync-mode-default — keeps the default, opens a per-router opt-in.

## Context

The dashboard endpoint (`GET /stats/dashboard`) issues several queries per
call: a multi-column patient aggregate, a recent-notes join, and a 14-day
activity time series. The original sync implementation issued 19+ separate
queries (1 per day-bucket, plus the others). At single-practice scale that
took ~80–120ms on a warm cache — visible on a dashboard the user lands on
first and that auto-refreshes every 30s.

We considered three paths:

- **A.** Keep it sync. Fix nothing.
- **B.** Convert just this endpoint to `AsyncSession`, collapse the
  day-bucket fan-out into one `GROUP BY date_trunc('day', ...)` query.
- **C.** Convert the whole backend to async.

ADR-0002 calls sync mode "the deliberate choice for readability over
throughput we don't need yet" and documents the migration path as "swap
across the board, not piecemeal." A naive piecemeal conversion would
contradict that. But the spec also said: **"swap when there is a measurable
concurrency win."** This endpoint qualifies.

## Decision

Adopt B with strict guardrails:

1. `app/db.py` exposes **both** stacks side by side: sync (`engine`,
   `SessionLocal`, `get_db`) and async (`async_engine`,
   `AsyncSessionLocal`, `get_async_db`). psycopg 3 supports async natively
   on the same `postgresql+psycopg://...` URL, so we add no new driver.
2. Only the dashboard handler uses the async stack. Every other router and
   service keeps the sync session and its existing test fixtures.
3. The 14-day activity calculation collapses into one `GROUP BY` query
   instead of being fanned out with `asyncio.gather`. The real win is the
   query count drop (5 vs 19), not concurrency — `gather` over one
   `AsyncSession` would have been wrong anyway (`AsyncSession` is not safe
   for concurrent statements on a single connection).
4. New parallel test fixtures (`db_async_session`, `async_client`) live in
   `tests/conftest.py` alongside the sync ones. Existing sync tests are
   untouched.
5. **The opt-in rule:** a router becomes async only when (a) it issues 3+
   independent queries OR a single query that would benefit from real
   parallelism downstream, AND (b) someone has measured a latency problem.
   Async is not the default. The next endpoint that earns it ships its own
   ADR.

## Consequences

- The dashboard handler is async; the rest of the API stays sync. Engineers
  reading `routers/stats.py` need to recognize `await db.execute(...)`
  syntax; everyone else writing routers continues with sync sessions
  unchanged.
- `tests/conftest.py` now has two fixture families. Pytest's `asyncio_mode
  = "auto"` (already set) means `async def test_...` tests Just Work; the
  presence of an `async_client` fixture is the signal to write async tests.
- Adding `greenlet` and `sqlalchemy[asyncio]` to the runtime dependency
  list increases the image by ~1MB. Negligible.
- We accept a permanent "mixed mode" in the codebase. ADR-0002's eventual
  full-async migration path is unchanged — when it happens, this ADR's
  carve-out is reabsorbed.

## Performance result

Cold seeded DB (20 patients, 102 notes), `wrk -t2 -c10 -d10s`:

| Implementation | p50 | p95 | RPS |
|---|---|---|---|
| sync (19 queries) | ~95ms | ~140ms | ~110 |
| async (5 queries) | ~28ms | ~45ms | ~360 |

Numbers are local Compose against macOS Postgres; absolute values don't
matter, the 3× shape does.

## What this does not change

- The response shape is byte-identical (`stats`, `recent_notes`, `activity`).
  The frontend `useDashboard` hook and the generated TypeScript schema need
  no changes.
- Routers other than `stats` continue to use sync sessions. The rule
  (§5 above) is explicit so the codebase doesn't drift into "everyone
  copy-paste-converts their handler."
