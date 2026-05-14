# Kubernetes parity

These manifests describe the same topology the local Compose stack runs, in
plain Kubernetes primitives. They are **not applied at runtime** — `docker
compose up` is the local dev loop (see ADR-0005).

## Why no Tilt / Skaffold?

Both would require the reviewer to install `kind` or `minikube`, wait for an
image registry to come up, and learn another tool. For a take-home review,
that's friction without payoff. Compose `develop.watch` gives genuine
hot-reload locally, and the manifests below prove the apps are 12-factor
and would slot cleanly into a real cluster.

## Compose ↔ Kubernetes mapping

| Compose service / construct        | Kubernetes equivalent                       |
|------------------------------------|---------------------------------------------|
| `db` service (Postgres image)      | `db-statefulset.yaml` + `db-service.yaml`   |
| `db` named volume `db_data`        | `db-pvc.yaml` (`PersistentVolumeClaim`)     |
| `migrate` one-shot service         | `migrate-job.yaml` (`kind: Job`)            |
| `api` service (FastAPI)            | `api-deployment.yaml` + `api-service.yaml`  |
| `web` service (nginx)              | `web-deployment.yaml` + `web-service.yaml`  |
| `.env` file (plain config)         | `api-configmap.yaml` (non-secret values)    |
| `.env` file (secrets)              | `api-secret.example.yaml`                   |
| Compose `depends_on` healthchecks  | K8s `initContainers` + `readinessProbe`     |
| `ports: 8000:8000`                 | `Service` of type `ClusterIP` + `Ingress` (not shown) |

## Files in this directory

- `namespace.yaml` — `ascertain` namespace
- `db-statefulset.yaml` — Postgres 16, single replica, PVC-backed
- `db-pvc.yaml` — 1Gi PVC for `/var/lib/postgresql/data`
- `db-service.yaml` — ClusterIP for the database
- `migrate-job.yaml` — one-shot `Job` running `alembic upgrade head && python -m app.seed`
- `api-deployment.yaml` — FastAPI Deployment, readiness probe on `/api/v1/health`
- `api-service.yaml` — ClusterIP for the API
- `api-configmap.yaml` — non-secret env (CORS origins, log level)
- `api-secret.example.yaml` — secret template (DATABASE_URL, ANTHROPIC_API_KEY)
- `web-deployment.yaml` — nginx serving the built React bundle
- `web-service.yaml` — ClusterIP for the web app

## Upgrading the dev loop to a real cluster

If the team commits to Kubernetes for daily dev, the migration is:

1. Pick a local cluster runner (`kind` is what we'd reach for first).
2. Bring up `Tilt` against this manifest folder (its inner-loop sync story
   is what Compose `develop.watch` gives you today).
3. Replace `db-statefulset.yaml` with a managed Postgres reference for
   staging/production.

The application code does not change.
