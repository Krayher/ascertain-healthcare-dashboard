# ADR 0005 · K8s parity via static manifests + Compose `develop.watch`

**Status:** Accepted · 2026-05-14

## Context

The brief calls for a development loop that will eventually run on
Kubernetes. The candidates for emulating that loop locally were:

1. **Tilt** — declarative `Tiltfile`, runs against a real local cluster
   (`kind` / `minikube`), live-syncs source into running pods.
2. **Skaffold** — similar to Tilt, Google-backed, broader CD story.
3. **Docker Compose with `develop.watch`** — file watching + sync/rebuild
   primitives baked into Compose v2.

Tilt and Skaffold mirror real production behavior most faithfully, but they
require the reviewer to install `kind` (or another cluster runtime), wait
for an image registry to come up, and learn the tool. That friction wins
when a team is committing to Kubernetes day-to-day; it loses for a one-shot
review.

## Decision

Use **Compose `develop.watch`** as the runtime dev loop, and ship a `k8s/`
folder of plain manifests (`Deployment`, `Service`, `ConfigMap`, `Secret`,
`PersistentVolumeClaim`) that describes the same topology in Kubernetes
primitives. The manifests are not applied automatically — they exist to:

- Document how each Compose service maps onto a K8s primitive (sibling
  README in `k8s/`).
- Prove the apps are 12-factor: config via env, ephemeral processes,
  stateless tiers, attached resources.
- Give a future K8s migration a starting point instead of a blank repo.

The Compose stack uses `develop.watch` with two action types:

- `sync` — mirrors source folders into the container without rebuild
  (Python `app/`, frontend `src/`).
- `rebuild` — triggers a full image rebuild when manifests change
  (`pyproject.toml`, `package.json`).

## Consequences

- `docker compose up` is the only command a reviewer needs.
- The K8s manifests document intent without paying a runtime cost.
- A real K8s migration requires: containerized images already exist; just
  push them to a registry, `kubectl apply -f k8s/`, swap the Compose
  `db` for a managed Postgres, and you're done.
- Trade-off: we don't catch K8s-specific issues (probe semantics, image
  pull secrets, RBAC) locally. Acceptable for a take-home.

## Alternatives considered

- **Tilt:** rejected for review friction. Documented in the K8s README as the
  upgrade path when the team commits to K8s.
- **Skaffold:** same reasons.
- **Plain `docker-compose` without `develop.watch`:** loses hot-reload —
  acceptable for production-style boots but inferior to the watch-based
  inner loop a developer wants.
