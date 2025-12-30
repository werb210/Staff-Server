#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE_URL:-http://localhost:8080}"

curl -fsS "$BASE/health" | grep -q "ok"

curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{}' | grep -q 400

TOKEN=$(node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({ uid: 'smoke' }, process.env.JWT_SECRET));")

curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/users" | grep -q 200
