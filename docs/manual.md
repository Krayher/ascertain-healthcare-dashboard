# Manual

Two audiences: developers and clinicians. Each section is self-contained.

---

## For developers

### Prerequisites

- Docker Desktop (or an equivalent container runtime) with `docker compose`.
- For running tests outside containers: Python 3.12 + [uv](https://docs.astral.sh/uv/), Node 22 + [pnpm](https://pnpm.io/) 10.

### Quickstart

```bash
git clone <repo>
cd ascertain-healthcare-dashboard
cp .env.example .env
docker compose up --build
```

This builds three images (`api`, `web`, plus a Postgres pull), runs Alembic
migrations + idempotent seed, then starts the API on `:8000` and the web
app on `:5173`.

Open <http://localhost:5173/>.

### Smoke check

```bash
curl http://localhost:8000/api/v1/health
# {"status":"ok"}

curl http://localhost:8000/api/v1/patients | jq '.total'
# 20
```

### Hot-reload during development

Two options:

**Option A — `docker compose watch` (mirrors production topology):**

```bash
docker compose watch
```

This uses the `develop.watch` block in `docker-compose.yml`. Editing
`apps/api/app/*.py` syncs into the running API container; editing
`pyproject.toml` triggers a rebuild. The web container does not hot-reload
in this mode (it serves a built bundle); use Option B for frontend work.

**Option B — run apps directly (faster inner loop):**

```bash
# Terminal 1: deps + DB
docker compose up -d db migrate

# Terminal 2: API
cd apps/api
uv venv && source .venv/bin/activate
uv pip install -e . pytest pytest-asyncio httpx ruff mypy 'testcontainers[postgres]'
uvicorn app.main:app --reload --port 8000

# Terminal 3: web
cd apps/web
pnpm install
pnpm dev
```

Vite serves with HMR on `:5173`. API restarts on code change via `--reload`.

### Running tests

```bash
# Backend (requires Docker for testcontainers)
cd apps/api && .venv/bin/pytest -v

# Frontend
cd apps/web && pnpm test
```

### Regenerating API types

After changing a Pydantic schema:

```bash
# 1. Restart the API so /openapi.json reflects the change
docker compose up -d --build api

# 2. Regenerate the TypeScript client
cd apps/web
pnpm api:types
```

`apps/web/src/lib/api/schema.ts` is `.gitignore`'d on purpose — regenerate
locally; CI builds against the live API.

### Enabling the Claude summarizer

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
docker compose up -d --build api
```

The `/patients/{id}/summary` response now returns `"source": "claude"`.
If the API key is missing, malformed, or the call times out, the endpoint
falls back to the template implementation (`"source": "template"`).

### Project layout cheat-sheet

```
ascertain-healthcare-dashboard/
├── apps/
│   ├── api/                       FastAPI service
│   │   ├── app/                   routers, services, models, schemas
│   │   ├── alembic/versions/      schema migrations
│   │   └── tests/                 pytest suite
│   └── web/                       Vite + React app
│       ├── src/
│       │   ├── app/               router, providers, layout, error boundary
│       │   ├── features/          patients, notes, dashboard
│       │   ├── components/ui/     shared primitives
│       │   └── lib/               cn, theme, format, api client
│       └── public/
├── docs/
│   ├── specs/                     design spec
│   ├── plans/                     implementation plan
│   ├── adr/                       architecture decision records
│   ├── diagrams/                  HLD
│   ├── design/mockups.html        approved mockups
│   └── manual.md                  this file
├── k8s/                           Kubernetes parity manifests
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## For clinicians (mock workflow)

### Sign in

The MVP ships without authentication — every visitor is treated as
**Dr. Anya Reeves**. (Real auth lives behind ADR-001 future work.)

### Find a patient

1. Click **Patients** in the sidebar.
2. Type a name, MRN, or condition in the filter box.
3. Use the status pills to narrow to *Active*, *Follow-up*, or *Inactive*.
4. Click column headers (**Patient**, **Last visit**) to sort.

### Review a patient

Click any row. The detail page shows:

- **AI-assisted summary** at the top — a synthesized narrative covering
  identifiers, conditions, allergies, and the most recent activity.
- **Clinical notes**, newest first.
- The **side rail** with phone, address, conditions, and allergies.

### Add a note

1. From the patient detail page, scroll to the composer at the bottom of
   the notes list.
2. Type your note. The timestamp is captured automatically on save.
3. Click **Save**. The summary regenerates and the list reorders.

### Edit a patient

1. From the patient header, click **Edit**.
2. Update fields. Required fields are marked with a small ·.
3. Click **Save changes**. Validation runs first on the client, then on the
   server — errors land next to the offending field.

### Delete a patient

1. From the patient header, click **Delete**.
2. Type the patient's last name in the confirmation dialog. This deletes
   the patient and all of their notes (cascade).

### Switch themes

The theme toggle lives in the sidebar under **Account**. The choice persists
across reloads.
