# ADR 0001 · Monorepo layout with `apps/api` and `apps/web`

**Status:** Accepted · 2026-05-14

## Context

The take-home is a single deliverable but contains two independently buildable
artifacts (Python service, TypeScript SPA). Splitting them into two repos
would force two clones, two READMEs, and two Docker Compose entry points for
a reviewer. Co-locating them under one root with `apps/*` keeps the project
boundary obvious while preserving per-service tooling.

## Decision

Use a flat monorepo with two siblings under `apps/`:

- `apps/api` — FastAPI service, owns its `pyproject.toml`, Dockerfile, tests.
- `apps/web` — Vite + React app, owns its `package.json`, Dockerfile, tests.

A single `docker-compose.yml` at the root orchestrates both, plus Postgres
and a one-shot `migrate` service. There is **no JS workspace tool** (pnpm
workspaces, Nx, Turborepo) because there is no code to share between the two
apps — the only contract is the OpenAPI schema, which is consumed via codegen
(see ADR-0003).

## Consequences

- Reviewers can clone once and `docker compose up` once.
- Each app stays runnable in isolation (`cd apps/api && uv run uvicorn ...`,
  `cd apps/web && pnpm dev`).
- No risk of accidental cross-imports between the two apps.
- If the project later adopts a worker, scheduler, or mobile client, they slot
  in as `apps/worker`, `apps/scheduler`, etc., without restructuring.
