#!/usr/bin/env bash
set -euo pipefail

echo "=== ROUTE TRACE ==="

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"

ROUTE_FILE="server/src/routes/pipeline.ts"

if [[ ! -f "$ROUTE_FILE" ]]; then
  echo "✗ Missing route file: $ROUTE_FILE"
  exit 1
fi

echo "--- ROUTE FILE CONTENTS ---"
sed -n '1,200p' "$ROUTE_FILE"

echo "--- ROUTE EXPORTS ---"
grep -E "export (const|function)" -n "$ROUTE_FILE" || true

echo "--- ROUTES DEFINED ---"
grep -E "router\\.(get|post|put|patch|delete)" -n "$ROUTE_FILE" || true

echo "✓ Route trace complete"
