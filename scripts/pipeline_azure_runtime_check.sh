#!/usr/bin/env bash
set -euo pipefail

echo "=== AZURE RUNTIME CHECK ==="

APP_URL="https://boreal-staff-server-e4hmaqkbk2g5h9fv.canadacentral-01.azurewebsites.net"

echo "--- Health ---"
curl -sSf "$APP_URL/api/_int/health" >/dev/null \
  && echo "✓ Health OK" || echo "✗ Health FAIL"

echo "--- Pipeline route ---"
curl -sSf "$APP_URL/api/pipeline/cards" >/dev/null \
  && echo "✓ Pipeline OK" || echo "✗ Pipeline FAIL"

echo "--- Route registration ---"
curl -sSf "$APP_URL/api/_int/routes" | grep -i pipeline || echo "✗ Not registered"

echo "✓ Azure runtime check complete"
