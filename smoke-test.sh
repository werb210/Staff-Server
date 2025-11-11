#!/bin/bash
set -euo pipefail

# -----------------------------
# STAFF APP STEPWISE SMOKE TEST
# -----------------------------
BASE_URL="${BASE_URL:-http://localhost:5000}"
PORT="${PORT:-5000}"
SERVER_CMD=("npx" "tsx" "server/src/index.ts")
SERVER_PID=0
STARTED_SERVER=0

# Cleanup function to kill server if started
cleanup() {
  if [[ $STARTED_SERVER -eq 1 && -n $SERVER_PID ]]; then
    echo "Stopping temporary server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# -----------------------------
# Function to wait for server
# -----------------------------
wait_for_server() {
  local retries=30
  local delay=1
  for ((i=1;i<=retries;i++)); do
    if curl -s "$BASE_URL/api/_int/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$delay"
  done
  return 1
}

# -----------------------------
# Start server if not running
# -----------------------------
if ! curl -s "$BASE_URL/api/_int/health" >/dev/null 2>&1; then
  echo "Starting temporary server..."
  "${SERVER_CMD[@]}" &
  SERVER_PID=$!
  STARTED_SERVER=1
  sleep 5
fi

# -----------------------------
# Function to test endpoint
# -----------------------------
test_endpoint() {
  local url="$1"
  local label="$2"
  local result
  result=$(curl -s "$url" 2>/dev/null || echo "")
  if [[ -z "$result" ]]; then
    echo "[FAIL] $label - no response"
    return
  fi
  # Check valid JSON
  if echo "$result" | jq . >/dev/null 2>&1; then
    echo "[PASS] $label"
  else
    echo "[FAIL] $label - invalid JSON"
    echo "Response: $result"
  fi
}

# -----------------------------
# Stepwise endpoint testing
# -----------------------------
echo "Running Staff App smoke tests..."

test_endpoint "$BASE_URL/api/_int/health" "Health Check"
test_endpoint "$BASE_URL/api/applications" "Applications GET"
test_endpoint "$BASE_URL/api/documents" "Documents GET"
test_endpoint "$BASE_URL/api/lenders" "Lenders GET"
test_endpoint "$BASE_URL/api/pipeline" "Pipeline GET"
test_endpoint "$BASE_URL/api/communication/sms" "Communication SMS GET"
test_endpoint "$BASE_URL/api/admin/retry-queue" "Admin Retry Queue GET"
test_endpoint "$BASE_URL/api/notifications" "Notifications GET"

echo "Smoke test complete."
