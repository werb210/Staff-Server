#!/usr/bin/env bash
set -euo pipefail

BASE="${1:-http://127.0.0.1:5099}"
PORT="${BASE##*:}"
LOG_FILE="./tmp-api-contract.log"

fail() { echo "❌ FAIL: $1"; exit 1; }
pass() { echo "✅ $1"; }

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [[ ! -f dist/index.js ]]; then
  npm run build
fi

: > "$LOG_FILE"
NODE_ENV=test PORT="$PORT" node dist/index.js > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

echo "Booting server (PID $SERVER_PID) on $BASE"

for _ in {1..40}; do
  if curl -s "$BASE/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

if ! curl -s "$BASE/health" >/dev/null 2>&1; then
  echo "Server failed to start; log output:"
  cat "$LOG_FILE"
  fail "server did not start"
fi

ROUTES_JSON=""
for _ in {1..40}; do
  ROUTES_JSON=$(grep -m1 '"type":"routes"' "$LOG_FILE" || true)
  if [[ -n "$ROUTES_JSON" ]]; then
    break
  fi
  sleep 0.25
done

if [[ -z "$ROUTES_JSON" ]]; then
  echo "Route list missing; log output:"
  cat "$LOG_FILE"
  fail "route list not found"
fi

echo "Captured routes:"
echo "$ROUTES_JSON"

echo "$ROUTES_JSON" | node - <<'NODE' > /tmp/api_routes.txt
const fs = require('fs');
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  const payload = JSON.parse(input);
  const routes = (payload.routes || [])
    .filter(r => typeof r.path === 'string' && r.path.startsWith('/api/'))
    .map(r => ({
      method: r.method,
      path: r.path
        .replace(/\*+/g, 'test')
        .replace(/:([^/]+)/g, 'test')
    }));
  for (const route of routes) {
    console.log(`${route.method} ${route.path}`);
  }
});
NODE

if [[ ! -s /tmp/api_routes.txt ]]; then
  fail "no /api routes detected"
fi

while IFS= read -r line; do
  METHOD="${line%% *}"
  PATH="${line#* }"
  if [[ "$METHOD" == "HEAD" ]]; then
    continue
  fi

  if [[ "$METHOD" == "GET" ]]; then
    RESPONSE_HEADERS=$(curl -s -D - -o /dev/null -X "$METHOD" "$BASE$PATH")
  else
    RESPONSE_HEADERS=$(curl -s -D - -o /dev/null -X "$METHOD" -H "Content-Type: application/json" -d '{}' "$BASE$PATH")
  fi

  HEADER_LOWER=$(echo "$RESPONSE_HEADERS" | tr -d '\r' | tr '[:upper:]' '[:lower:]')
  echo "$HEADER_LOWER" | grep -q "content-type: application/json" || fail "$METHOD $PATH missing application/json"
  echo "$HEADER_LOWER" | grep -q "content-type: text/html" && fail "$METHOD $PATH returned text/html"
  pass "$METHOD $PATH JSON"
done < /tmp/api_routes.txt

UNKNOWN_HEADERS=$(curl -s -D - -o /dev/null "$BASE/api/this-should-never-exist")
UNKNOWN_LOWER=$(echo "$UNKNOWN_HEADERS" | tr -d '\r' | tr '[:upper:]' '[:lower:]')
echo "$UNKNOWN_LOWER" | grep -q "content-type: application/json" || fail "unknown /api missing application/json"
echo "$UNKNOWN_LOWER" | grep -q "content-type: text/html" && fail "unknown /api returned text/html"
pass "unknown /api JSON"

echo "ALL API CONTRACT TESTS PASSED"
