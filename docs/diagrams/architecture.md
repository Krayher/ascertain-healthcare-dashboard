# High-Level Architecture

Two diagrams. The first shows the deployable topology; the second walks one
representative request — `GET /patients/{id}/summary` — through every layer
to illustrate the pluggable summarizer.

---

## 1 · Container diagram

```mermaid
flowchart LR
  subgraph Browser
    UI["React SPA<br/>(Vite, Tailwind,<br/>TanStack Query, Zustand)"]
  end

  subgraph Compose["Docker Compose"]
    WEB["web<br/>nginx · serves /dist"]
    API["api<br/>FastAPI · uvicorn<br/>+ logging middleware"]
    MIG["migrate<br/>one-shot<br/>(alembic + seed)"]
    DB[("db<br/>Postgres 16")]
  end

  Claude(("Anthropic API<br/>optional"))

  UI -->|fetch /patients<br/>/notes /summary<br/>/stats /health| API
  WEB -.->|serves static files| UI
  API -->|x-request-id<br/>echoed in response| UI
  API -->|SQLAlchemy| DB
  MIG -->|upgrade head| DB
  MIG -.->|service_completed_successfully| API
  API -.->|when ANTHROPIC_API_KEY set| Claude

  classDef ext fill:#fef3c7,stroke:#b45309,color:#000;
  class Claude ext
```

**Key:** solid arrows are runtime requests, dashed arrows are control/setup
dependencies. The Claude edge is dashed because it's only present when an
`ANTHROPIC_API_KEY` is provisioned (see ADR-0004). Every API response
carries an `x-request-id` header from the logging middleware in
`apps/api/app/middleware/logging.py`.

---

## 2 · Sequence: `GET /patients/{id}/summary`

```mermaid
sequenceDiagram
  autonumber
  actor Doctor as Clinician
  participant UI as React (TanStack Query)
  participant API as FastAPI router
  participant Svc as services.summarizer
  participant Tpl as TemplateSummarizer
  participant Claude as ClaudeSummarizer
  participant DB as Postgres

  Doctor->>UI: opens /patients/:id
  UI->>API: GET /patients/{id}/summary
  API->>DB: SELECT patient + notes
  DB-->>API: rows
  API->>Svc: build_summarizer()
  alt ANTHROPIC_API_KEY set
    Svc-->>API: ClaudeSummarizer
    API->>Claude: summarize(patient, notes)
    alt Claude responds within 8s
      Claude-->>API: { summary, source: "claude" }
    else timeout or error
      Claude->>Tpl: fallback
      Tpl-->>API: { summary, source: "template" }
    end
  else key not set
    Svc-->>API: TemplateSummarizer
    API->>Tpl: summarize(patient, notes)
    Tpl-->>API: { summary, source: "template" }
  end
  API-->>UI: 200 { summary, source, note_count }
  UI-->>Doctor: renders SummaryPanel
```

The router never branches on which implementation is active — `Depends`
hands it whichever `Summarizer` was built at startup. The fallback path is
encapsulated *inside* `ClaudeSummarizer`, so callers always see a successful
response (with `source: "template"` if Claude failed).

---

## Layer boundaries

| Layer        | What lives here                                         | Allowed deps                                |
|--------------|---------------------------------------------------------|---------------------------------------------|
| `routers/`   | HTTP shape: paths, params, status codes, dep injection | `services/`, `schemas/`                     |
| `services/`  | Business logic: queries, mutations, summarization      | `models/`, `schemas/`, `db.py`              |
| `models/`    | SQLAlchemy ORM                                          | `db.py`                                     |
| `schemas/`   | Pydantic request/response                               | (none)                                      |
| `seed.py`    | Idempotent fixture data                                 | `models/`, `db.py`                          |

On the frontend:

| Layer                  | What lives here                              |
|------------------------|----------------------------------------------|
| `features/<x>/routes/` | Page components, route-level data fetching   |
| `features/<x>/api.ts`  | Query/mutation hooks for the feature         |
| `features/<x>/components/` | UI components owned by the feature       |
| `features/<x>/schema.ts`   | Zod schemas (forms)                      |
| `components/ui/`           | Shared primitives (Button, Input, Select) |
| `lib/`                     | Cross-cutting helpers (theme, role, format, API client) |

### Client state (Zustand stores)

Three small persisted stores plus one in-memory store. Each is independently
testable and read via a hook.

| Store                              | Persisted? | Purpose                                       |
|------------------------------------|------------|-----------------------------------------------|
| `lib/theme.ts` (`useTheme`)        | localStorage | Light / dark theme, with system-prefers detect |
| `lib/role.ts` (`useRole`)          | localStorage | Active role (`staff` / `admin`) + `useCan(perm)` selector |
| `features/patients/view-mode.ts`   | localStorage | Patient list view mode (`table` / `cards`)    |
| `app/layout/sidebar-state.ts`      | in-memory    | Mobile sidebar drawer open/close              |

Server state is owned by TanStack Query and is never duplicated into these
stores. The role and theme stores are read on first render to hydrate the
right UI; cross-tab consistency comes from the persist middleware writing
to the same `localStorage` key.
