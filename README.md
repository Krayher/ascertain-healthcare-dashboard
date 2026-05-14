# Ascertain · Healthcare Dashboard

A patient-management dashboard for a small medical practice. Full-stack:
FastAPI + Postgres on the backend, Vite + React + TypeScript on the
frontend, packaged with Docker Compose for one-command local startup.

> **Why this exists:** built as a take-home assignment. Optimized for
> readability and judgment over feature breadth — every decision worth
> calling out is documented in `docs/adr/`.

---

## Quickstart

```bash
git clone <repo>
cd ascertain-healthcare-dashboard
cp .env.example .env
docker compose up --build
```

In ~90 seconds:

- Postgres comes up on `:5432`.
- Migrations + seed run automatically (20 patients, ~100 notes).
- API serves at <http://localhost:8000/api/v1>.
- Web app at <http://localhost:5173>.

Open the web app and click around. The dashboard, patient list, detail
view, form (create + edit), and notes are all wired up.

To enable the Claude-powered summary endpoint, set `ANTHROPIC_API_KEY` in
`.env` and rebuild the `api` service. Without it, the endpoint returns a
template-generated summary — fully usable, no provisioning required.

---

## Architecture at a glance

```
Browser  ──►  web (nginx)  ──serves──►  React SPA
                                            │
                                            └──fetch──►  api (FastAPI)  ──SQLAlchemy──►  db (Postgres)
                                                             │
                                                             └──optional──►  Anthropic API
```

- **`apps/api`** — FastAPI service. Routers → services → SQLAlchemy models.
  Pluggable summarizer (template default, Claude when key set). Alembic
  migrations, idempotent seed.
- **`apps/web`** — Vite + React 18 + TypeScript strict. TanStack Query for
  server state, Zustand for client UI state, React Hook Form + Zod for
  forms. OpenAPI types codegen'd from the live `/openapi.json`. shadcn-style
  primitives + Tailwind, theme persisted to localStorage.

Full diagrams: [`docs/diagrams/architecture.md`](docs/diagrams/architecture.md).

---

## What's in the box

| Brief requirement | Status | Notes |
|---|---|---|
| Patient CRUD endpoints | ✅ | All 5 endpoints + pagination, sort, status filter, name/MRN search |
| Patient notes + summary | ✅ | Notes CRUD + pluggable summarizer with graceful Claude→template fallback |
| Responsive shell | ✅ | Sidebar + topbar + content area, dark + light themes |
| Patient form | ✅ | React Hook Form + Zod, server-422 mapping, used for create + edit |
| Docker Compose | ✅ | `db` + `migrate` (Alembic + seed) + `api` + `web` |
| Validation + error handling | ✅ | 422 with per-field errors, 400 on invalid sort, 404s |

**Stretch goals (curated subset, see ADR-0007):**

- ✅ Sorting / filtering query parameters on the list endpoint
- ✅ Alembic migrations with autogenerate
- ✅ Virtualization (TanStack Virtual) above 50 rows
- ✅ Code splitting (every route is a lazy chunk)
- ✅ Dark / light theme switching, persisted
- ✅ Unit tests (Pytest 23 tests / Vitest 13 tests)
- ✅ GitHub Actions CI (`api` + `web` parallel jobs)

**Deliberately deferred:**

- Authentication / multi-tenant isolation (single-practice assumption)
- E2E tests (called out in the spec)
- Real-time collaboration on notes (CRUD only)
- Memoization theater (no `useMemo` / `React.memo` without a profiler reason)

---

## Documentation

- [`docs/specs/2026-05-14-healthcare-dashboard-design.md`](docs/specs/2026-05-14-healthcare-dashboard-design.md) — full design spec
- [`docs/plans/2026-05-14-healthcare-dashboard.md`](docs/plans/2026-05-14-healthcare-dashboard.md) — phased implementation plan (11 phases)
- [`docs/diagrams/architecture.md`](docs/diagrams/architecture.md) — HLD: container diagram + request sequence
- [`docs/adr/`](docs/adr) — 7 ADRs:
  - [`0001-monorepo-layout.md`](docs/adr/0001-monorepo-layout.md)
  - [`0002-state-management.md`](docs/adr/0002-state-management.md)
  - [`0003-api-typing.md`](docs/adr/0003-api-typing.md)
  - [`0004-summarizer-strategy.md`](docs/adr/0004-summarizer-strategy.md)
  - [`0005-k8s-parity-without-tilt.md`](docs/adr/0005-k8s-parity-without-tilt.md)
  - [`0006-migrations-and-seeding.md`](docs/adr/0006-migrations-and-seeding.md)
  - [`0007-virtualization-threshold.md`](docs/adr/0007-virtualization-threshold.md)
- [`docs/manual.md`](docs/manual.md) — developer + clinician manual
- [`docs/design/mockups.html`](docs/design/mockups.html) — approved design mockups (5 screens, light + dark)
- [`k8s/`](k8s) — Kubernetes parity manifests + Compose-to-K8s mapping

---

## Running tests

```bash
# Backend (testcontainers spins up Postgres; needs Docker)
cd apps/api
uv venv && source .venv/bin/activate
uv pip install -e . pytest pytest-asyncio httpx ruff mypy 'testcontainers[postgres]'
pytest -v   # 23 tests, ~3s

# Frontend
cd apps/web
pnpm install
pnpm test   # 13 tests, ~1.5s
pnpm typecheck
pnpm build
```

CI runs both suites in parallel jobs on every push and PR.

---

## Known gaps

- **No auth.** The app treats every visitor as `Dr. Anya Reeves`. Auth would
  add a session table, login UI, and JWT/session middleware — out of scope
  for the take-home but the cleanest seam to add it is `routers/` deps.
- **No E2E tests.** Pytest exercises the API end-to-end through `TestClient`;
  Vitest covers component behavior. A Playwright happy-path would be the
  natural next test investment.
- **Search is `ILIKE %x%`.** Fine at 20–10k patients; switches to `pg_trgm`
  or a search service past that.
- **Last-write-wins on patient edits.** Concurrent edits don't conflict —
  acceptable for a single-practice MVP, called out so it isn't surprising.

---

## License

Take-home submission — not licensed for redistribution.
