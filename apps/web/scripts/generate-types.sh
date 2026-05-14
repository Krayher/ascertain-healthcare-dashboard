#!/usr/bin/env sh
# Regenerate OpenAPI types from the running API.
#
# Usage: pnpm api:types
# Requires the API to be reachable at $API_URL (defaults to localhost:8000).
set -eu

API_URL="${API_URL:-http://localhost:8000}"
OPENAPI_URL="${API_URL}/api/v1/openapi.json"
OUT="src/lib/api/schema.ts"

echo "→ Fetching schema from ${OPENAPI_URL}"
pnpm exec openapi-typescript "${OPENAPI_URL}" -o "${OUT}"
echo "→ Wrote ${OUT}"
