#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-https://staff.boreal.financial}"

fail() { echo "❌ FAIL: $1"; exit 1; }
pass() { echo "✅ $1"; }

echo "Testing API contract against: $BASE"
echo "----------------------------------"

# Health
H=$(curl -s -i "$BASE/health")
echo "$H" | grep -qi "application/json" || fail "/health not JSON"
pass "/health JSON"

# Known API routes (generated from printRoutes output)
ROUTES=(
  "/api/auth/login"
  "/api/auth/logout"
  "/api/auth/me"
  "/api/users"
  "/api/applications"
  "/api/lenders"
  "/api/products"
)

for R in "${ROUTES[@]}"; do
  RES=$(curl -s -i "$BASE$R")
  echo "$RES" | grep -qi "application/json" || fail "$R returned HTML"
  pass "$R JSON"
done

# Unknown API route must still be JSON
U=$(curl -s -i "$BASE/api/this-should-never-exist")
echo "$U" | grep -qi "application/json" || fail "unknown /api returned HTML"
pass "unknown /api JSON"

echo "----------------------------------"
echo "ALL API CONTRACT TESTS PASSED"
