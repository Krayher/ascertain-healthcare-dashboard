# Healthcare Dashboard — Specification

**Status:** Living document — reflects shipped behavior on `claude/youthful-wing-5720b5`.
**Version:** 0.2.0
**Last Updated:** 2026-05-17

---

## 1. Purpose

Provide a patient management dashboard for a medical practice that enables clinical staff to view, create, edit, and annotate patient records, and to generate human-readable summaries from a patient's profile and clinical notes.

The system must be architected to grow toward multiple user types, complex workflows, and real-time features without requiring a rewrite.

## 2. Scope

### In Scope
- Patient record CRUD (personal + medical information)
- Patient list with search, sort, pagination, **and advanced filtering** (blood type, condition substring, age range)
- **Table and card** views for the patient list, toggleable and persisted per user
- Per-patient clinical notes (create, list, delete)
- Per-patient generated summary endpoint and view
- **Workspace dashboard** with KPIs, recent-note feed, and status-distribution chart
- **Global topbar search** that filters the patient list from anywhere in the app
- **Frontend role switcher** between Clinical Staff and Administrator (UI gating only, see §3)
- Light/dark theme switching, persisted per user
- Responsive web UI with navigation shell
- Containerized local development environment (frontend, backend, database) with optional hot-reload overlay

### Out of Scope
- Authentication and authorization (no user accounts in this iteration)
- Multi-tenancy across practices
- Real-time collaboration (WebSockets, presence)
- HIPAA-grade compliance controls (audit logs, encryption at rest, etc.)
- Production deployment infrastructure (Kubernetes manifests exist for parity only)

### Assumptions
- Single deployment environment, single practice, no auth.
- Seed data of 20 patients is sufficient for evaluation, but the list view must scale to 100+ records without degradation.
- An LLM is optionally available for summary generation; a template-based fallback is acceptable and is the default.

---

## 3. Personas

### P1 — Clinical Staff Member
Primary user. Needs fast access to patient records, ability to add notes during/after visits, and to skim a summary before walking into a room.

### P2 — Practice Administrator
Secondary user. Creates and edits patient records, ensures data quality. Same interface, broader edit activity.

> **Role switcher (demo).** The sidebar avatar opens a popover that
> toggles between Clinical Staff and Administrator. The selection
> persists in `localStorage`. On change, the app **reloads** so server
> state and UI gates are guaranteed consistent for the new role.
>
> | Action                            | Staff | Admin |
> |-----------------------------------|:-----:|:-----:|
> | View patients, notes, summary     |  ✅   |  ✅   |
> | Add / delete clinical notes       |  ✅   |  ✅   |
> | Create / edit / delete patients   |  ❌   |  ✅   |
>
> This is a **frontend-only demo** of role-aware UI, not real
> enforcement — a determined user with the browser devtools can flip
> the role, or hit the API directly. Authentication is still out of
> scope (§2). When auth lands, the same `useCan(permission)` hook
> becomes the integration point.

---

## 4. User Scenarios

### S1 — Browse the patient roster
**As** clinical staff
**I want** to see all patients with key vitals at a glance
**So that** I can find the patient I need quickly

**Acceptance:**
- The list shows name, age, last visit, and status for each patient.
- The list paginates and remains responsive with 100+ records (table view virtualizes past 50 rendered rows).
- I can sort by name, last visit, or created-at.
- I can search by name or MRN; typing does not block the UI (debounced 250 ms).
- I can filter by status, blood type, condition substring, and age range; filters are reflected in the URL and survive a refresh.

### S2 — View a patient's full record
**As** clinical staff
**I want** to open a single patient's detail page
**So that** I can review their information and history

**Acceptance:**
- Navigating to `/patients/:id` shows personal info, medical info, notes, and the generated summary.
- An invalid or missing ID renders a 404 view, not a crash.

### S3 — Create a new patient
**As** a practice administrator
**I want** to add a new patient via a form
**So that** they can be seen at the practice

**Acceptance:**
- The form captures personal info (name, DOB, contact, address) and medical info (allergies, conditions, blood type, status).
- Invalid input shows a field-level error before submission.
- The server validates independently; server 422 errors are mapped back to the offending fields with the server's exact message.
- On success, the new patient appears in the list.

### S4 — Edit an existing patient
**As** a practice administrator
**I want** to update an existing patient's information
**So that** records stay accurate

**Acceptance:**
- The same form pre-populates with the patient's current values.
- Submitting updates the record server-side and reflects on the list and detail views.

### S5 — Add and review clinical notes
**As** clinical staff
**I want** to attach timestamped notes to a patient
**So that** clinical context is preserved across visits

**Acceptance:**
- I can submit a note via a form on the patient detail page.
- Existing notes display with timestamps, most recent first.
- I can delete a note I no longer want.
- Adding a note updates the patient's `last_visit` when the note's timestamp is more recent.

### S6 — Read a patient summary
**As** clinical staff
**I want** to see a synthesized summary of a patient
**So that** I can get oriented before an appointment without re-reading every note

**Acceptance:**
- The summary view includes name, age, blood type, conditions, allergies, and a coherent narrative drawn from the notes.
- The summary is fetched on demand from a dedicated endpoint.
- When `ANTHROPIC_API_KEY` is set the summary is generated by Claude; otherwise a deterministic template is used. The response identifies the source.

### S7 — Recover from network failure
**As** any user
**I want** the app to tell me when something failed
**So that** I don't lose data or work silently

**Acceptance:**
- Failed requests surface a visible error message.
- Form submissions do not silently drop on network failure.
- API responses include an `x-request-id` header (echoing the caller's if supplied) to aid support.

### S8 — Switch between table and card views
**As** any user
**I want** to choose between a dense table and a card grid for the patient list
**So that** I can use the layout that fits my screen and task

**Acceptance:**
- A segmented control in the list header toggles Table ↔ Cards.
- The selection persists in `localStorage` (key `ascertain-patient-view`).
- All filters, sort, pagination, and URL state carry over when switching modes.

### S9 — Search from anywhere
**As** any user
**I want** a global search box in the topbar
**So that** I can jump to the filtered list without navigating first

**Acceptance:**
- The topbar exposes a search input with `⌘K` / `Ctrl+K` to focus.
- Typing debounces (250 ms) then navigates to `/patients?search=…&page=1`.
- Pressing Enter flushes immediately; Esc clears the input.
- When already on `/patients`, the input mirrors the URL and clearing it clears the list filter.

### S10 — Visit the dashboard
**As** any user
**I want** a workspace overview with stats and a status-distribution chart
**So that** I can see practice health at a glance

**Acceptance:**
- `/` shows totals for active / follow-up / inactive patients and notes-this-week.
- A 14-day notes-activity bar chart shows recent volume.
- A stacked-bar status-distribution chart with legend totals to 100 %.
- A recent-notes list links each note to the patient detail.

---

## 5. Functional Requirements

### FR1 — Patient resource
The system **shall** persist patients with at minimum: `id`, `name`, `date_of_birth`, `contact`, `address`, `allergies`, `conditions`, `blood_type`, `status`, `last_visit`, `created_at`, `updated_at`. Computed fields `age` and `mrn` **shall** be derived on read.

### FR2 — Patient CRUD API
The system **shall** expose:
- `GET /patients` — paginated list. Supports query params: `page`, `page_size` (≤100), `search` (matches name or id), `status`, `blood_type`, `condition` (substring), `age_min`, `age_max`, `sort` (`last_visit | name | created_at`), `order` (`asc | desc`). Unknown values return **400**.
- `GET /patients/{id}` — single patient
- `POST /patients` — create
- `PUT /patients/{id}` — update
- `DELETE /patients/{id}` — delete (cascades notes)

### FR3 — Note resource
The system **shall** persist notes attached to a single patient, with at minimum: `id`, `patient_id`, `timestamp` (clinical event time, caller-supplied or defaulted), `content`, and server-set `created_at`.

### FR4 — Notes API
The system **shall** expose:
- `POST /patients/{id}/notes` — add a note. Accepts optional `timestamp`; defaults to now.
- `GET /patients/{id}/notes` — list notes, ordered by `timestamp` descending.
- `DELETE /patients/{id}/notes/{note_id}` — delete a note.

### FR5 — Summary API
The system **shall** expose `GET /patients/{id}/summary` returning `{ summary, source, note_count }` synthesized from the patient's profile and notes. Synthesis **shall** use the Claude API when `ANTHROPIC_API_KEY` is set, and a deterministic template otherwise. The `source` field identifies which path produced the result.

### FR6 — Health check
The system **shall** expose `GET /health` returning `{"status": "ok"}` for liveness checks.

### FR7 — Seed data
On a fresh database, the system **shall** populate 20 realistic sample patients (each with 3–8 notes) automatically. The seed **shall** be idempotent — re-running it on a populated database is a no-op.

### FR8 — Validation
The system **shall** validate input both client-side (Zod, before submission) and server-side (Pydantic, independently). Invalid input **shall** return HTTP `422` with a structured per-field error body. Concrete rules currently enforced on both sides:

| Field | Rule |
|---|---|
| `name` | 1–160 chars |
| `date_of_birth` | required, must be in the past |
| `contact` | 1–200 chars; must contain a phone-shaped token (7+ digits, optional `+`/`-`/`()`/spaces) **or** an email |
| `address` | optional, ≤240 chars |
| `blood_type` | enum {`A+`,`A-`,`B+`,`B-`,`AB+`,`AB-`,`O+`,`O-`} |
| `status` | enum {`active`,`follow_up`,`inactive`} (default `active`) |
| `conditions`, `allergies` | each entry non-empty after trim, ≤80 chars; list ≤50 entries; trimmed on accept |
| `Note.content` | 1–4000 chars |

The frontend `PatientForm` maps each server `detail.loc[-1]` back to its input via `setError`, so server-only failures land on the right field.

### FR9 — Routing
The frontend **shall** provide routes for:
- `/` — dashboard home
- `/patients` — patient list
- `/patients/new` — create form (admin only)
- `/patients/:id` — patient detail
- `/patients/:id/edit` — edit form (admin only)
- `*` — 404 fallback

Attempting to reach the create or edit routes without the required role renders an in-page "Not authorized" view, not a hard crash.

### FR10 — Layout
The frontend **shall** render a persistent header (breadcrumbs + global search + actions), sidebar (nav + role switcher + theme toggle), and main content area across routes.

### FR11 — Workspace dashboard
The system **shall** expose `GET /stats/dashboard` returning headline counts (`total_patients`, `active_patients`, `follow_up_patients`, `inactive_patients`, `notes_this_week`), the 10 most recent notes (with denormalized `patient_name`), and a `number[]` of note counts for the last 14 days (oldest first).

### FR12 — Request observability
Every API response **shall** carry an `x-request-id` header. If the caller supplies one it is echoed; otherwise the server generates one. The server **shall** log every request as `METHOD PATH -> status in Xms [rid=…]` at INFO.

---

## 6. Non-Functional Requirements

### NFR1 — Performance
- The patient list **shall** remain interactive with 100+ records.
- Search input **shall** not block the main thread (250 ms debounce on both the page filter and the topbar search).
- The table view **shall** virtualize rendered rows past a threshold of 50 to keep scrolling smooth.

### NFR2 — Responsiveness
- The UI **shall** be usable at lower screen resolutions (no horizontal scroll at common laptop widths).
- The patient cards grid **shall** adapt: 1 column on mobile, up to 4 columns on wide screens.
- *(Known gap: the sidebar is a fixed 232 px column and does not collapse on phones. Acceptable for the staff/admin laptop use case.)*

### NFR3 — Error handling
- All API endpoints **shall** return appropriate HTTP status codes (`2xx`, `4xx`, `5xx`) — never a 200 wrapping an error.
- Network and validation failures **shall** surface visibly to the user.
- Validation failures **shall** be mapped to the offending field on the client whenever the server provides a `loc`.

### NFR4 — Local setup
- A developer **shall** be able to clone the repo and run `docker compose up` to launch frontend, backend, and database with no manual database setup.
- A `.env.example` file **shall** document every required environment variable.
- An optional `docker-compose.dev.yml` overlay **shall** enable hot-reload for both services via `docker compose -f docker-compose.yml -f docker-compose.dev.yml watch`.

### NFR5 — Code quality
- The frontend **shall** be configured with TypeScript (strict), ESLint, and Prettier.
- The backend code **shall** follow PEP 8 / standard Python tooling conventions (Ruff in CI).
- CI **shall** run lint + typecheck + unit tests + build on every push and PR; a separate E2E job boots the full stack and runs Playwright; a separate images job builds the api + web Docker images with GHA layer cache.

### NFR6 — Reproducibility
- Database schema **shall** be recreatable by another developer via Alembic migrations checked into the repo.

---

## 7. Architecture Constraints

- **Frontend:** React 18 + TypeScript (strict), scaffolded with Vite. State: TanStack Query (server state), Zustand (UI/client state). Forms: React Hook Form + Zod. Routing: React Router. Styling: Tailwind CSS + CSS variables for the theme. Icons: lucide-react. List virtualization: `@tanstack/react-virtual`.
- **Backend:** FastAPI (Python 3.12), SQLAlchemy 2.0, Pydantic v2, Alembic for migrations, optional Anthropic SDK for the summarizer.
- **Database:** PostgreSQL 16.
- **Orchestration:** Docker Compose (with optional dev overlay for hot-reload). Kubernetes parity manifests live in `k8s/` for reference only.
- **API style:** REST with JSON payloads. Routes are unprefixed (`/patients`, not `/api/v1/patients`).

Choice of these libraries was made for: TypeScript fluency, scaffolding velocity, accessibility primitives, and a clear path to multi-user/real-time without a rewrite. See `docs/adr/` for the per-decision write-ups.

---

## 8. Data Model (Conceptual)

```
Patient
  id            (uuid, PK)
  name          (string, 1..160)
  date_of_birth (date)
  contact       (string, 1..200; must contain phone- or email-shaped token)
  address       (string?, ≤240)
  allergies     (string[])    -- each entry 1..80, list ≤ 50, trimmed
  conditions    (string[])    -- each entry 1..80, list ≤ 50, trimmed
  blood_type    (enum: A+, A-, B+, B-, AB+, AB-, O+, O-)
  status        (enum: active | follow_up | inactive, default 'active')
  last_visit    (timestamptz, nullable)
  created_at    (timestamptz, server-set)
  updated_at    (timestamptz, server-set)
  -- computed in response only:
  age           (int, derived from date_of_birth)
  mrn           (string, derived from id; format "MRN-XXXXX")

Note
  id          (uuid, PK)
  patient_id  (fk -> Patient.id, ON DELETE CASCADE)
  timestamp   (timestamptz, clinical event time, caller-supplied or defaulted)
  content     (text, 1..4000)
  created_at  (timestamptz, server-set; row insertion time)
```

---

## 9. API Contract (Summary)

| Method | Path | Purpose | Success / Errors |
|--------|------|---------|------------------|
| GET    | `/health` | Liveness probe | 200 |
| GET    | `/patients` | List patients (page-based pagination, see FR2) | 200 / 400 |
| GET    | `/patients/{id}` | Get one patient | 200 / 404 |
| POST   | `/patients` | Create patient | 201 / 422 |
| PUT    | `/patients/{id}` | Update patient | 200 / 404 / 422 |
| DELETE | `/patients/{id}` | Delete patient | 204 / 404 |
| GET    | `/patients/{id}/notes` | List notes (most recent first) | 200 / 404 |
| POST   | `/patients/{id}/notes` | Create note | 201 / 404 / 422 |
| DELETE | `/patients/{id}/notes/{note_id}` | Delete note | 204 / 404 |
| GET    | `/patients/{id}/summary` | Generated summary | 200 / 404 |
| GET    | `/stats/dashboard` | Workspace stats, recent notes, activity | 200 |

Pagination is **page-based**: `?page=N&page_size=M` (default `page=1`, `page_size=20`, max `page_size=100`). The list response envelope is `{ items, page, page_size, total, total_pages }`. Every response carries an `x-request-id` header (FR12).

---

## 10. Deliverables

- Public GitHub repository **or** zipped source archive.
- `README.md` covering: prerequisites, setup, run instructions, available scripts, environment variables, and the dev hot-reload overlay.
- Functioning `docker-compose.yml` that boots the entire stack.
- Optional `docker-compose.dev.yml` overlay for hot-reload.
- `.env.example` documenting required environment variables.

---

## 11. Stretch Goals — Status

Originally optional, all but one are now implemented. Tracked here so a reviewer can map effort.

| Goal | Status | Notes |
|---|---|---|
| **Perf** — list virtualization | ✅ Done | `PatientTableVirtual` past 50 rows |
| **Perf** — code splitting / lazy loading | ✅ Done | Every route is a lazy chunk |
| **Perf** — memoization | ⏸ Deferred | No profiler-led need; documented in ADR |
| **Backend** — sorting/filtering query params | ✅ Done | FR2 (`sort`, `order`, `status`, `blood_type`, `condition`, `age_min`, `age_max`) |
| **Backend** — request logging middleware | ✅ Done | FR12 |
| **Backend** — Alembic migrations | ✅ Done | 3 versions; CI verifies upgrade + downgrade |
| **UI** — dark / light theme | ✅ Done | Persisted to `localStorage` (`ascertain-theme`) |
| **UI** — advanced filtered search | ✅ Done | S1 acceptance |
| **UI** — status-distribution chart | ✅ Done | S10 acceptance |
| **Testing** — API unit tests | ✅ Done | 41 pytest tests |
| **Testing** — component tests | ✅ Done | 38 vitest tests |
| **Testing** — E2E happy-path | ✅ Done | Playwright `e2e/happy-path.spec.ts` |
| **DevX** — CI/CD pipeline | ✅ Done | api · web · e2e · images jobs in `.github/workflows/ci.yml` |
| **DevX** — Docker hot reload | ✅ Done | Both services via `docker-compose.dev.yml` overlay |

---

## 12. Evaluation Rubric

The submission will be assessed on:

1. **Technical decision-making** — architecture, library choices, state management, performance.
2. **Code quality** — adherence to software engineering best practices.
3. **API design** — RESTful conventions, error handling, status codes.
4. **Documentation & setup** — README clarity, one-command local boot.
5. **Correctness and completeness** of each part.
6. **Requirements interpretation** — evidence the spec was read and applied.

---

## 13. Resolved Decisions

Previously open; settled by the current implementation:

- **Summary caching.** Not cached — the summary endpoint recomputes on every request. The template path is cheap (microseconds); the Claude path is intentionally fresh per request. If usage grows, cache invalidation on note add/delete is the natural next step.
- **Pagination style.** Page-based with `?page=&page_size=` and a `total`/`total_pages` envelope. Documented in the README.
- **Delete semantics.** Hard delete. Patients delete-cascade their notes via the FK constraint.
- **Status enum.** Settled as `{active, follow_up, inactive}`.
- **API URL prefix.** No prefix — routes are mounted at the root (`/patients`, not `/api/v1/patients`). This matches §9 literally.

---

## 14. Known Gaps / Honest Caveats

- **No authentication.** Role switcher is a UI demo only (§3).
- **No mobile drawer for the sidebar.** Fixed 232 px column; targets laptop widths (NFR2).
- **No global toast/snackbar.** Errors surface inline; mutation errors outside the form path (e.g., note deletion) fail silently in the UI today.
- **No optimistic updates** on patient mutations. Each mutation waits for the server response before reflecting in the UI — deliberate for clinical data.
- **Search is `ILIKE %x%`**, fine to ~10 k rows; would switch to `pg_trgm` or a search service beyond that.
- **Last-write-wins on patient edits.** No concurrent-edit conflict resolution — acceptable for a single-practice MVP.
