#!/bin/bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5000}"
PORT="${PORT:-5000}"
SILO="${SILO:-BF}"
SERVER_START_CMD=("npx" "tsx" "server/src/index.ts")

STARTED_SERVER=0
SERVER_PID=""
SESSION_TOKEN=""

cleanup() {
  if [[ $STARTED_SERVER -eq 1 && -n "${SERVER_PID}" ]]; then
    echo "Stopping temporary server (PID ${SERVER_PID})..."
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required but not installed."
  exit 1
fi

wait_for_server() {
  local retries=30
  local delay=1
  for ((i=1; i<=retries; i++)); do
    if curl -sf "${BASE_URL}/api/_int/health" >/dev/null; then
      return 0
    fi
    sleep "${delay}"
  done
  return 1
}

ensure_server() {
  if curl -sf "${BASE_URL}/api/_int/health" >/dev/null; then
    echo "Detected running server at ${BASE_URL}."
    return
  fi

  echo "Starting temporary server with: ${SERVER_START_CMD[*]}"
  STARTED_SERVER=1
  (PORT="${PORT}" NODE_ENV=production "${SERVER_START_CMD[@]}" >/tmp/staff-app-smoke-server.log 2>&1) &
  SERVER_PID=$!

  if ! wait_for_server; then
    echo "Server failed to start within timeout."
    exit 1
  fi
  echo "Server is ready (PID ${SERVER_PID})."
}

run_checks() {
  local -a endpoints=(
    "/api/_int/health"
    "/api/applications"
    "/api/documents"
    "/api/lenders"
    "/api/pipeline"
    "/api/communication/sms"
    "/api/admin/retry-queue"
    "/api/notifications"
  )

  local failures=0

  for endpoint in "${endpoints[@]}"; do
    printf "Testing %s ... " "${endpoint}"
    local response http_status body
    local -a headers=("-H" "x-silo: ${SILO}")
    if [[ -n "${SESSION_TOKEN}" ]]; then
      headers+=("-H" "Authorization: Bearer ${SESSION_TOKEN}")
    fi

    if ! response=$(curl -sS -w "HTTPSTATUS:%{http_code}" "${headers[@]}" "${BASE_URL}${endpoint}" 2>/tmp/staff-app-smoke-error.log); then
      printf "FAIL (curl error)\n"
      cat /tmp/staff-app-smoke-error.log >&2
      : $((failures++))
      continue
    fi

    http_status="${response##*HTTPSTATUS:}"
    body="${response%HTTPSTATUS:*}"

    if [[ ! "${http_status}" =~ ^2 ]]; then
      printf "FAIL (status %s)\n" "${http_status}"
      echo "Response body:" >&2
      echo "${body}" >&2
      : $((failures++))
      continue
    fi

    if ! echo "${body}" | jq '.' >/tmp/staff-app-smoke-jq.log 2>&1; then
      printf "FAIL (invalid JSON)\n"
      cat /tmp/staff-app-smoke-jq.log >&2
      echo "Raw body:" >&2
      echo "${body}" >&2
      : $((failures++))
      continue
    fi

    printf "PASS\n"
  done

  if [[ ${failures} -gt 0 ]]; then
    echo "${failures} endpoint(s) failed." >&2
    return 1
  fi

  echo "All endpoints responded successfully."
}

ensure_server
ensure_session() {
  if [[ -n "${SESSION_TOKEN}" ]]; then
    return
  fi

  local credential_id=""
  local public_key=""
  local secret=""

  case "${SILO}" in
    BF)
      credential_id="bf-cred-1"
      public_key="bf-public-key"
      secret="bf-secret"
      ;;
    SLF)
      credential_id="slf-cred-1"
      public_key="slf-public-key"
      secret="slf-secret"
      ;;
    BI)
      SESSION_TOKEN="placeholder-token"
      return
      ;;
    *)
      credential_id="bf-cred-1"
      public_key="bf-public-key"
      secret="bf-secret"
      ;;
  esac

  local challenge="smoke-test-challenge"
  local signature
  signature=$(node --input-type=module - "${public_key}" "${secret}" "${challenge}" <<'NODE'
import { createHmac } from "crypto";
const [publicKey, secret, challenge] = process.argv.slice(2);
process.stdout.write(
  createHmac("sha256", `${publicKey}:${secret}`).update(challenge).digest("hex"),
);
NODE
  )

  local payload
  payload=$(jq -n \
    --arg cred "${credential_id}" \
    --arg chall "${challenge}" \
    --arg sig "${signature}" \
    '{credentialId: $cred, challenge: $chall, signature: $sig}')

  local response
  response=$(curl -sS -X POST \
    -H "Content-Type: application/json" \
    -H "x-silo: ${SILO}" \
    -d "${payload}" \
    "${BASE_URL}/api/auth/passkey")

  SESSION_TOKEN=$(echo "${response}" | jq -r '.session.token // empty')
  if [[ -z "${SESSION_TOKEN}" ]]; then
    echo "Failed to obtain session token for silo ${SILO}" >&2
    echo "Response: ${response}" >&2
    exit 1
  fi
}

ensure_session
run_checks
