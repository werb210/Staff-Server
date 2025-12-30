#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"

curl -fsS "$BASE/health" | grep -q "ok"
curl -fsS "$BASE/api/_int/health" | grep -q "ok"
