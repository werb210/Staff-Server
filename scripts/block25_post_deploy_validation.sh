#!/usr/bin/env bash
set -euo pipefail

echo "=== BLOCK 25: POST-DEPLOY VALIDATION + LIVE TEST HARNESS START ==="

###############################################
# 0) VARS
###############################################
AZURE_APP_NAME="boreal-staff-server"
AZURE_RESOURCE_GROUP="boreal-production"

APP_URL=$(az webapp show \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$AZURE_APP_NAME" \
  --query defaultHostName -o tsv)

BASE="https://${APP_URL}"
echo "Target: $BASE"

###############################################
# 1) BASIC AVAILABILITY CHECK
###############################################
echo "Checking /api/_int/build ..."
curl -s -w "\nCODE:%{http_code}\n" "$BASE/api/_int/build" > codex-check-build.json
cat codex-check-build.json

###############################################
# 2) CRITICAL ROUTES TEST
###############################################
mkdir -p codex-tests

declare -a ROUTES=(
  "/api/_int/build"
  "/api/health"
  "/api/contacts"
  "/api/pipeline"
  "/api/documents"
)

for r in "${ROUTES[@]}"; do
  echo "Testing: $r"
  curl -s -w "\nCODE:%{http_code}\n" "$BASE$r" > "codex-tests/$(echo "$r" | tr '/' '_').json" || true
done

###############################################
# 3) DOCUMENT ROUTES PROBE
###############################################
echo "Synthetic probe → document endpoint"
curl -s -w "\nCODE:%{http_code}\n" "$BASE/api/documents/test-id/preview" > codex-tests/documents_preview.json || true

###############################################
# 4) PIPELINE ROUTES PROBE
###############################################
echo "Synthetic probe → pipeline endpoint"
curl -s -w "\nCODE:%{http_code}\n" "$BASE/api/pipeline/cards" > codex-tests/pipeline_cards.json || true

###############################################
# 5) CHECK RESPONSE SIZE + LATENCY
###############################################
echo "Latency check..."
curl -o /tmp/lat.out -s -w "time_connect:%{time_connect}\ntime_starttransfer:%{time_starttransfer}\ntime_total:%{time_total}\n" "$BASE/api/_int/build"
cat /tmp/lat.out

###############################################
# 6) ASSEMBLE RESULT REPORT
###############################################
echo "Assembling report..."

{
  echo "=== CODex Validation Report ==="
  echo "Timestamp: $(date -Is)"
  echo "App URL: $BASE"
  echo ""
  echo "--- Build Health ---"
  cat codex-check-build.json
  echo ""
  echo "--- Latency ---"
  cat /tmp/lat.out
  echo ""
  echo "--- Route Results ---"
  ls codex-tests/
} > CODEx_REPORT.txt

echo ""
echo "Report saved → CODEx_REPORT.txt"
echo ""

###############################################
# 7) PASS/FAIL DECISION
###############################################
if grep -q '"ok": true' codex-check-build.json; then
  echo "=== BLOCK 25 PASSED ==="
else
  echo "❌ BLOCK 25 FAILED — /api/_int/build not healthy"
  exit 1
fi

echo "=== BLOCK 25 COMPLETE ==="
