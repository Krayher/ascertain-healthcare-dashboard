# Healthcare Dashboard — Specification

**Status:** Draft
**Version:** 0.1.0
**Last Updated:** 2026-05-14

---

## 1. Purpose

Provide a patient management dashboard for a medical practice that enables clinical staff to view, create, edit, and annotate patient records, and to generate human-readable summaries from a patient's profile and clinical notes.

The system must be architected to grow toward multiple user types, complex workflows, and real-time features without requiring a rewrite.

## 2. Scope

### In Scope
- Patient record CRUD (personal + medical information)
- Patient list with search, sort, and pagination
- Per-patient clinical notes (create, list, delete)
- Per-patient generated summary endpoint and view
- Responsive web UI with navigation shell
- Containerized local development environment (frontend, backend, database)

### Out of Scope
- Authentication and authorization (no user accounts in this iteration)
- Multi-tenancy across practices
- Real-time collaboration (WebSockets, presence)
- HIPAA-grade compliance controls (audit logs, encryption at rest, etc.)
- Production deployment infrastructure

### Assumptions
- Single deployment environment, single practice, no auth.
- Seed data of 15–20 patients is sufficient for evaluation, but the list view must scale to 100+ records without degradation.
- An LLM is optionally available for summary generation; a template-based fallback is acceptable.

---

## 3. Personas

### P1 — Clinical Staff Member
Primary user. Needs fast access to patient records, ability to add notes during/after visits, and to skim a summary before walking into a room.

### P2 — Practice Administrator
Secondary user. Creates and edits patient records, ensures data quality. Same interface, broader edit activity.

> Note: No role enforcement in this iteration. Both personas share a single unauthenticated UI.

---

## 4. User Scenarios

### S1 — Browse the patient roster
**As** clinical staff
**I want** to see all patients with key vitals at a glance
**So that** I can find the patient I need quickly

**Acceptance:**
- The list shows name, age, last visit, and status for each patient.
- The list paginates (or virtualizes) and remains responsive with 100+ records.
- I can sort by at least one column.
- I can search by name; typing does not block the UI.

### S2 — View a patient's full record
**As** clinical staff
**I want** to open a single patient's detail page
**So that** I can review their information and history

**Acceptance:**
- Navigating to `/patients/:id` shows personal info, medical info, notes, and a link to the summary.
- An invalid or missing ID renders a 404 view, not a crash.

### S3 — Create a new patient
**As** a practice administrator
**I want** to add a new patient via a form
**So that** they can be seen at the practice

**Acceptance:**
- The form captures personal info (name, DOB, contact, address) and medical info (allergies, conditions, blood type, status).
- Invalid input shows a field-level error before submission.
- The server validates independently; server errors render meaningful messages.
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

### S6 — Read a patient summary
**As** clinical staff
**I want** to see a synthesized summary of a patient
**So that** I can get oriented before an appointment without re-reading every note

**Acceptance:**
- The summary view includes name, age, blood type, conditions, allergies, and a coherent narrative drawn from the notes.
- The summary is fetched on demand from a dedicated endpoint.

### S7 — Recover from network failure
**As** any user
**I want** the app to tell me when something failed
**So that** I don't lose data or work silently

**Acceptance:**
- Failed requests surface a visible error message.
- Form submissions do not silently drop on network failure.

---

## 5. Functional Requirements

### FR1 — Patient resource
The system **shall** persist patients with at minimum: id, name, date of birth, contact info, address, allergies, conditions, blood type, status, and last-visit timestamp.

### FR2 — Patient CRUD API
The system **shall** expose:
- `GET /patients` — paginated list
- `GET /patients/{id}` — single patient
- `POST /patients` — create
- `PUT /patients/{id}` — update
- `DELETE /patients/{id}` — delete

### FR3 — Note resource
The system **shall** persist notes attached to a single patient, with at minimum: id, patient_id, timestamp, and text content.

### FR4 — Notes API
The system **shall** expose:
- `POST /patients/{id}/notes` — add a note
- `GET /patients/{id}/notes` — list notes for a patient
- `DELETE /patients/{id}/notes/{note_id}` — delete a note

### FR5 — Summary API
The system **shall** expose `GET /patients/{id}/summary` returning a synthesized summary derived from the patient's profile and notes. Synthesis **may** use an LLM or a deterministic template.

### FR6 — Health check
The system **shall** expose `GET /health` returning `{"status": "ok"}` for liveness checks.

### FR7 — Seed data
On a fresh database, the system **shall** populate 15–20 realistic sample patients automatically.

### FR8 — Validation
The system **shall** validate input both client-side (before submission) and server-side (independently). Invalid input **shall** return HTTP `422` with a structured error body.

### FR9 — Routing
The frontend **shall** provide routes for: dashboard home (`/`), patient list (`/patients`), patient detail (`/patients/:id`), and a 404 fallback for unknown routes.

### FR10 — Layout
The frontend **shall** render a persistent header (navigation), sidebar, and main content area across routes.

---

## 6. Non-Functional Requirements

### NFR1 — Performance
- The patient list **shall** remain interactive with 100+ records.
- Search input **shall** not block the main thread (debounced or async filtering).

### NFR2 — Responsiveness
- The UI **shall** be usable at lower screen resolutions (no horizontal scroll at common laptop widths).

### NFR3 — Error handling
- All API endpoints **shall** return appropriate HTTP status codes (`2xx`, `4xx`, `5xx`) — never a 200 wrapping an error.
- Network and validation failures **shall** surface visibly to the user.

### NFR4 — Local setup
- A developer **shall** be able to clone the repo and run `docker compose up` to launch frontend, backend, and database with no manual database setup.
- A `.env.example` file **shall** document every required environment variable.

### NFR5 — Code quality
- The frontend **shall** be configured with TypeScript, a linter, and a formatter.
- The backend code **shall** follow PEP 8 / standard Python tooling conventions.

### NFR6 — Reproducibility
- Database schema **shall** be recreatable by another developer via migrations or init scripts checked into the repo.

---

## 7. Architecture Constraints

- **Frontend:** React + TypeScript, scaffolded with Vite.
- **Backend:** FastAPI (Python).
- **Database:** PostgreSQL.
- **Orchestration:** Docker Compose.
- **API style:** REST with JSON payloads.

Choice of UI framework, state management library, routing library, and styling approach is left to the implementer — the choice **shall** be justifiable for a dashboard that will grow in feature count and user types.

---

## 8. Data Model (Conceptual)

```
Patient
  id            (uuid / int)
  name          (string)
  date_of_birth (date)
  contact       (string)
  address       (string)
  allergies     (string[] or text)
  conditions    (string[] or text)
  blood_type    (enum: A+, A-, B+, B-, AB+, AB-, O+, O-)
  status        (enum: active, inactive, ...)
  last_visit    (timestamp, nullable)
  created_at    (timestamp)
  updated_at    (timestamp)

Note
  id          (uuid / int)
  patient_id  (fk -> Patient.id, cascade delete)
  timestamp   (timestamp)
  content     (text)
  created_at  (timestamp)
```

Exact field types, nullability, and indexing decisions are left to the implementer.

---

## 9. API Contract (Summary)

| Method | Path | Purpose | Success |
|--------|------|---------|---------|
| GET    | `/health` | Liveness probe | 200 |
| GET    | `/patients` | List patients (paginated) | 200 |
| GET    | `/patients/{id}` | Get one patient | 200 / 404 |
| POST   | `/patients` | Create patient | 201 / 422 |
| PUT    | `/patients/{id}` | Update patient | 200 / 404 / 422 |
| DELETE | `/patients/{id}` | Delete patient | 204 / 404 |
| GET    | `/patients/{id}/notes` | List notes | 200 / 404 |
| POST   | `/patients/{id}/notes` | Create note | 201 / 404 / 422 |
| DELETE | `/patients/{id}/notes/{note_id}` | Delete note | 204 / 404 |
| GET    | `/patients/{id}/summary` | Generated summary | 200 / 404 |

Pagination parameters (e.g., `?page=`, `?limit=`, or cursor-based) are an implementer decision but **shall** be documented in the README.

---

## 10. Deliverables

- Public GitHub repository **or** zipped source archive.
- `README.md` covering: prerequisites, setup, run instructions, available scripts, and environment variables.
- Functioning `docker-compose.yml` that boots the entire stack.
- `.env.example` documenting required environment variables.

---

## 11. Out-of-Scope Stretch Goals

Implementers **may** select 1–2 of the following based on remaining time and personal strengths. These are not part of the acceptance baseline.

- **Performance** — list virtualization, code splitting, memoization
- **Backend** — query-param sorting/filtering, request logging middleware, Alembic migrations
- **UI/UX** — dark/light theme, advanced filtered search, status-distribution chart
- **Testing** — API unit tests, component tests, E2E happy-path
- **DevX** — CI/CD pipeline, hot reload inside Docker

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

## 13. Open Questions

- Should the summary endpoint be cached per-patient until a new note is added? *(Performance vs. freshness tradeoff — implementer's call for this iteration.)*
- Pagination style: offset/limit, page-based, or cursor? *(Document the choice in README.)*
- Soft delete vs. hard delete for patients and notes? *(Default: hard delete unless the implementer argues otherwise.)*
