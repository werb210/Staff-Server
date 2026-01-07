#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-https://staff.boreal.financial}"

fail() {
  echo "❌ FAIL: $1"
  exit 1
}

pass() {
  echo "✅ $1"
}

echo "Testing API contract against: $BASE"
echo "------------------------------------"

### 1. HEALTH
echo "→ /health"
H=$(curl -s -i "$BASE/health")
echo "$H" | grep -qi "application/json" || fail "/health not JSON"
echo "$H" | grep -qi '"ok"' || fail "/health missing ok:true"
pass "/health returns JSON"

### 2. UNKNOWN API ROUTE
echo "→ /api/does-not-exist"
U=$(curl -s -i "$BASE/api/does-not-exist")
echo "$U" | grep -qi "application/json" || fail "/api/* unknown returned HTML"
echo "$U" | grep -q "404" || fail "/api/* unknown not 404"
pass "/api/* unknown returns JSON 404"

### 3. AUTH LOGIN (BAD CREDS)
echo "→ /api/auth/login (bad creds)"
A=$(curl -s -i -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"nope@test.com","password":"nope"}')

echo "$A" | grep -qi "application/json" || fail "/api/auth/login returned HTML"
pass "/api/auth/login returns JSON on error"

### 4. AUTH LOGIN (EMPTY BODY)
echo "→ /api/auth/login (empty body)"
A2=$(curl -s -i -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "$A2" | grep -qi "application/json" || fail "/api/auth/login empty body returned HTML"
pass "/api/auth/login empty body JSON"

### 5. RANDOM API DEPTH
for p in \
  /api/foo \
  /api/foo/bar \
  /api/foo/bar/baz \
  /api/v1/test \
  /api/internal/test
do
  echo "→ $p"
  R=$(curl -s -i "$BASE$p")
  echo "$R" | grep -qi "application/json" || fail "$p returned HTML"
done
pass "All random /api/* paths return JSON"

### 6. ROOT SPA
echo "→ /"
ROOT=$(curl -s -i "$BASE/")
echo "$ROOT" | grep -qi "text/html" || fail "/ did not return HTML"
pass "/ serves SPA HTML"

### 7. RANDOM NON-API PATH
echo "→ /random-page"
SPA=$(curl -s -i "$BASE/random-page")
echo "$SPA" | grep -qi "text/html" || fail "Non-API path did not return HTML"
pass "Non-API paths serve SPA"

echo
echo "🎉 ALL API CONTRACT TESTS PASSED"
