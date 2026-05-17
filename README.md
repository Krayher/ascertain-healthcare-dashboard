# Ascertain · Healthcare Dashboard

A patient-management dashboard for a small medical practice. Full-stack:
FastAPI + Postgres on the backend, Vite + React + TypeScript on the
frontend, packaged with Docker Compose for one-command local startup.

> **Why this exists:** built as a take-home assignment. Optimized for
> readability and judgment over feature breadth — every decision worth
> calling out is documented in `docs/adr/`. [`SPEC.md`](SPEC.md) is the
> living source of truth for what the app does today.

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
- API serves at <http://localhost:8000>.
- Web app at <http://localhost:5173>.

Open the web app and click around. The dashboard, patient list (table and
card views), detail view, form (create + edit), notes, role switcher, and
global search are all wired up.

To enable the Claude-powered summary endpoint, set `ANTHROPIC_API_KEY` in
`.env` and rebuild the `api` service. Without it, the endpoint returns a
template-generated summary — fully usable, no provisioning required.

### Hot reload (both services)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml watch
```

Edits under `apps/api/app/` sync into the running container; edits under
`apps/web/src/` trigger Vite HMR through the dev server. Dependency files
(`pyproject.toml`, `package.json`) trigger a rebuild.

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
  migrations, idempotent seed. Request logging middleware adds
  `x-request-id` to every response.
- **`apps/web`** — Vite + React 18 + TypeScript strict. TanStack Query for
  server state, Zustand for client UI state (theme, role, view mode,
  drawer), React Hook Form + Zod for forms. shadcn-style primitives +
  Tailwind, theme persisted to localStorage. Responsive down to 320 px
  with a sidebar drawer.

Full diagrams (Mermaid container + request sequence + state tables):
[`docs/diagrams/architecture.md`](docs/diagrams/architecture.md).

---

## What's in the box

### Baseline (every brief requirement)

| Brief requirement | Status | Notes |
|---|---|---|
| Patient CRUD endpoints | ✅ | All 5 + pagination, sort, status / blood_type / condition / age filters, name & MRN search |
| Patient notes + summary | ✅ | Notes CRUD + pluggable summarizer with graceful Claude → template fallback |
| Responsive shell | ✅ | Sidebar + topbar + content area, dark + light themes, drawer below 768 px |
| Patient form | ✅ | React Hook Form + Zod, server-422 mapping, used for create + edit |
| Docker Compose | ✅ | `db` + `migrate` (Alembic + seed) + `api` + `web` |
| Validation + error handling | ✅ | 422 per-field, 400 on bad query params, 404s, network-failure banners |

### Stretch goals — 13 of 14 shipped

| Category | Item | Status |
|---|---|---|
| Performance | List virtualization (TanStack Virtual >50 rows) | ✅ |
| Performance | Code splitting (every route is a lazy chunk) | ✅ |
| Performance | Memoization | ⏸ Deliberately deferred — no profiler reason |
| Backend | Query-param sorting / filtering (incl. blood_type, condition, age range) | ✅ |
| Backend | Request logging middleware (`x-request-id` + access log) | ✅ |
| Backend | Alembic migrations | ✅ 3 versions; up/down both verified |
| UI/UX | Dark / light theme, persisted | ✅ |
| UI/UX | Advanced filtered search | ✅ |
| UI/UX | Status-distribution chart on dashboard | ✅ |
| Testing | API unit tests | ✅ 41 pytest |
| Testing | Component tests | ✅ 38 vitest |
| Testing | E2E happy-path + responsive mobile | ✅ 5 Playwright |
| DevX | CI/CD pipeline | ✅ 4 jobs: api · web · e2e · images |
| DevX | Hot reload in Docker | ✅ Both services, `docker-compose.dev.yml` overlay |

### Beyond the brief

- **Frontend role switcher** with `useCan(perm)` permission hook (Staff
  vs Administrator) — UI gating only, ready for real auth (see ADR-0008).
- **Patient list view modes** — table or card grid, persisted per user.
- **Global topbar search** — ⌘K / Ctrl+K shortcut, debounced, URL-synced.
- **Responsive down to phones** — sidebar drawer + reflowed grids
  (see ADR-0009).
- **Tighter validation** — contact must include phone or email; conditions
  / allergies caps (see ADR-0010).

---

## Documentation

Read these in roughly this order:

1. [`SPEC.md`](SPEC.md) — **canonical source of truth.** Reflects shipped
   behavior, organized as user scenarios + functional / non-functional
   requirements + resolved decisions.
2. [`docs/diagrams/architecture.md`](docs/diagrams/architecture.md) — HLD:
   Mermaid container diagram, request sequence for `/summary`, layer
   boundaries, client-state stores.
3. [`docs/adr/`](docs/adr) — 10 ADRs. Each captures one decision with
   context, trade-offs, and consequences.
4. [`docs/manual.md`](docs/manual.md) — developer + clinician operator
   manual.
5. [`docs/design/mockups.html`](docs/design/mockups.html) — design
   mockups (5 screens, light + dark).
6. [`k8s/`](k8s) — Kubernetes parity manifests + Compose-to-K8s mapping.

Earlier planning artifacts under [`docs/specs/`](docs/specs) and
[`docs/plans/`](docs/plans) are kept as a historical record of what was
planned vs. what ended up shipping. **`SPEC.md` supersedes them where they
disagree.**

### Architecture Decision Records

| # | Title | One-liner |
|---|---|---|
| 0001 | [Monorepo layout](docs/adr/0001-monorepo-layout.md) | Two apps under `apps/`, no JS workspace tool |
| 0002 | [State management](docs/adr/0002-state-management.md) | TanStack Query for server state, Zustand for UI |
| 0003 | [API typing](docs/adr/0003-api-typing.md) | OpenAPI codegen, hand-written types after spec lock-in |
| 0004 | [Summarizer strategy](docs/adr/0004-summarizer-strategy.md) | Pluggable Claude / template with graceful fallback |
| 0005 | [K8s parity without Tilt](docs/adr/0005-k8s-parity-without-tilt.md) | Compose for dev, manifests as reference |
| 0006 | [Migrations and seeding](docs/adr/0006-migrations-and-seeding.md) | Alembic + idempotent seed, one-shot service |
| 0007 | [Virtualization threshold](docs/adr/0007-virtualization-threshold.md) | 50 rows; below that, plain table is fine |
| 0008 | [Role switcher + UI gating](docs/adr/0008-role-switcher.md) | Frontend-only demo of role-aware UI |
| 0009 | [Responsive layout](docs/adr/0009-responsive-layout.md) | Sidebar drawer + media-query hook for `aria-hidden` |
| 0010 | [Validation rules mirrored](docs/adr/0010-validation-mirrored.md) | Same Zod + Pydantic rules, server-422 maps to fields |

---

## Running tests

```bash
# Backend (testcontainers spins up Postgres; needs Docker)
cd apps/api
uv venv && source .venv/bin/activate
uv pip install -e . pytest pytest-asyncio httpx ruff mypy 'testcontainers[postgres]'
pytest -v   # 41 tests, ~4s

# Frontend unit
cd apps/web
pnpm install
pnpm test         # 38 tests, ~2s
pnpm typecheck
pnpm build

# Frontend E2E (Playwright; needs the full stack running)
docker compose up -d --build
pnpm exec playwright install chromium
pnpm e2e          # 5 tests (happy-path + 4 responsive mobile)
```

CI runs lint / typecheck / unit on every push and PR; a separate `e2e` job
boots the full stack via Compose and runs Playwright; a separate `images`
job builds the api + web Docker images with GHA layer cache.

---

## Known gaps

- **No auth.** The role switcher is a UI demo only — a determined user
  can hit the API directly. ADR-0008 documents the integration seam for
  real auth.
- **No mobile drawer for the sidebar on tablet portrait** — the drawer
  pattern handles phones; tablet portrait (~768 px) sits awkwardly
  between modes. Acceptable for the targeted laptop use case.
- **No global toast / snackbar.** Non-form mutation failures (e.g., note
  deletion) fail silently in the UI today.
- **No optimistic UI updates** on patient mutations — deliberate for
  clinical data, but the trade-off is noticeable latency on slow
  networks.
- **Search is `ILIKE %x%`.** Fine at 20–10 k patients; switches to
  `pg_trgm` or a search service past that.
- **Last-write-wins on patient edits.** No concurrent-edit conflict
  resolution — acceptable for a single-practice MVP.

---

## License

Take-home submission — not licensed for redistribution.
