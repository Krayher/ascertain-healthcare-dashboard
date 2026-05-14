# ADR 0003 · API types via `openapi-typescript` codegen

**Status:** Accepted · 2026-05-14

## Context

The frontend needs to call ~10 endpoints with typed request/response shapes.
There are three places these types could come from:

1. Hand-written `.ts` files mirroring the Pydantic schemas.
2. Codegen from the FastAPI-generated `openapi.json`.
3. tRPC (rejected — backend is Python, not Node).

Hand-written types drift silently the moment a Pydantic schema changes. The
common failure mode is a backend rename or required-field change that ships
without a frontend update, and the bug only surfaces at runtime in
production.

## Decision

FastAPI publishes `/api/v1/openapi.json` at boot. `openapi-typescript`
generates `apps/web/src/lib/api/schema.ts` from it. A thin wrapper in
`apps/web/src/lib/api/client.ts` provides:

- `api<T>(path, init?)` — typed fetch.
- `ApiError` — exception with `status` + raw `payload` (for 422 mapping).
- Convenience type aliases (`Patient`, `PatientPage`, `Summary`, etc.) that
  pull straight from the generated `paths` interface.

Regeneration is a script: `pnpm api:types`. The generated file is
`.gitignore`'d so PRs never carry codegen diffs.

## Consequences

- One source of truth (the Pydantic schemas) for both client and server.
- Breaking changes show up as type errors in the next `tsc -b`, not as 500s
  in production.
- Codegen requires the API to be running locally before the script can run.
  Acceptable — same dependency as running the app.
- If we ever ship to a CDN that can't reach the API during build, switch to
  reading a checked-in `openapi.json` snapshot.

## Alternatives considered

- **Hand-written types:** rejected — drift is the whole problem this solves.
- **Use the generated `paths` directly everywhere:** noisy at call sites
  (`paths["/api/v1/..."]["get"]["responses"]["200"]["content"]["application/json"]`).
  We extract named aliases once and the rest of the app uses those.
