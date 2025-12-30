#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"

AUTH_EMAIL="${AUTH_EMAIL:-}"
AUTH_PASSWORD="${AUTH_PASSWORD:-}"

health_body="$(curl -fsS "$BASE/health")"
[[ "$health_body" == "ok" ]] || { echo "/health unexpected response"; exit 1; }

ready_code="$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/api/_int/ready")"
[[ "$ready_code" == "200" ]] || { echo "/api/_int/ready not ready"; exit 1; }

AUTH_TEST="false"
if [[ -n "$AUTH_EMAIL" && -n "$AUTH_PASSWORD" ]]; then
  AUTH_TEST="true"
fi

if [[ "$AUTH_TEST" == "true" ]]; then
  login_json="$(curl -sS -X POST "$BASE/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$AUTH_EMAIL\",\"password\":\"$AUTH_PASSWORD\"}")"

  token="$(echo "$login_json" | jq -r '.token // empty')"
  [[ -n "$token" ]] || { echo "No token returned"; exit 1; }

  protected_code="$(curl -sS -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $token" \
    "$BASE/api/users")"

  [[ "$protected_code" == "200" ]] || { echo "Protected route failed"; exit 1; }
fi
