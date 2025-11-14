#!/usr/bin/env bash
set -euo pipefail

echo "=== BLOCK 26: FULL STAFF APP ENDPOINT MATRIX TEST ==="

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

mkdir -p endpoint-matrix
rm -f endpoint-matrix/*

###############################################
# 1) DEFINE ALL KNOWN ROUTE PATTERNS
###############################################
declare -a ROUTES=(
  "/api/_int/build"
  "/api/health"
  "/api/auth/login"
  "/api/auth/logout"
  "/api/auth/me"
  "/api/contacts"
  "/api/contacts/search"
  "/api/contacts/create"
  "/api/companies"
  "/api/pipeline"
  "/api/pipeline/cards"
  "/api/pipeline/stages"
  "/api/pipeline/activity"
  "/api/documents"
  "/api/documents/upload"
  "/api/documents/test-id"
  "/api/documents/test-id/preview"
  "/api/documents/test-id/download"
  "/api/applications"
  "/api/applications/create"
  "/api/applications/test-id"
  "/api/applications/test-id/documents"
  "/api/applications/test-id/documents/download-all"
  "/api/lenders"
  "/api/lenders/products"
  "/api/lenders/products/search"
  "/api/reports"
  "/api/reports/overview"
  "/api/reports/applications"
  "/api/reports/documents"
  "/api/reports/pipeline"
)

###############################################
# 2) DEFINE VERBS FOR GENERAL PROBING
###############################################
declare -a VERBS=("GET" "POST")

###############################################
# 3) PROBE ROUTES
###############################################
fail_count=0

for r in "${ROUTES[@]}"; do
  for v in "${VERBS[@]}"; do
    OUT="endpoint-matrix/$(echo "${r}_${v}" | tr '/' '_').json"
    echo "Testing $v $r → $OUT"

    curl -X "$v" -s -o "$OUT" \
      -w "\nCODE:%{http_code}\ntime_total:%{time_total}\n" \
      "$BASE$r" || true

    # Track failures
    if ! grep -q "CODE:200" "$OUT"; then
      echo "$v $r" >> endpoint-matrix/FAILURES.txt
      fail_count=$((fail_count+1))
    fi
  done
done

###############################################
# 4) BUILD FINAL MATRIX FILE
###############################################
{
  echo "=== STAFF ENDPOINT MATRIX REPORT ==="
  echo "Timestamp: $(date -Is)"
  echo "App URL: $BASE"
  echo ""
  echo "--- Failures ($fail_count) ---"
  if [ -f endpoint-matrix/FAILURES.txt ]; then
    cat endpoint-matrix/FAILURES.txt
  else
    echo "NONE"
  fi
  echo ""
  echo "--- Files ---"
  ls endpoint-matrix/
} > STAFF_ENDPOINT_MATRIX.txt

###############################################
# 5) EXIT WITH HEALTH RESULT
###############################################
if [ "$fail_count" -eq 0 ]; then
  echo "=== BLOCK 26 PASSED — No failing endpoints ==="
else
  echo "❌ BLOCK 26 COMPLETED WITH $fail_count FAILURES"
  echo "See endpoint-matrix/FAILURES.txt and STAFF_ENDPOINT_MATRIX.txt"
fi

echo "=== BLOCK 26 DONE ==="
