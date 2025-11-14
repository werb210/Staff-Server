#!/usr/bin/env bash
set -euo pipefail

echo "=== BLOCK 23: LOCAL RUNTIME VERIFICATION START ==="

###############################################
# 1) Ensure .env exists
###############################################
if [ ! -f server/.env ]; then
  echo "❌ ERROR: server/.env not found. Run Block 22 first."
  exit 1
fi

echo "Using environment:"
cat server/.env

###############################################
# 2) Install dependencies (idempotent)
###############################################
echo "Installing dependencies..."
cd server
npm install --legacy-peer-deps

###############################################
# 3) Run Prisma introspection
###############################################
echo "Running prisma validate..."
npx prisma validate

echo "Running prisma migrate status..."
npx prisma migrate status

echo "Running prisma db pull (schema sync)..."
npx prisma db pull

###############################################
# 4) Start server locally (background)
###############################################
echo "Starting server on port 5000..."
PORT=5000 nohup node dist/index.js >/tmp/boreal-local.log 2>&1 &
SERVER_PID=$!

sleep 3

###############################################
# 5) HEALTH CHECKS
###############################################
echo "Checking /api/_int/build..."
curl -s -o /tmp/health.json -w "%{http_code}" http://localhost:5000/api/_int/build

echo "Health response:"
cat /tmp/health.json

###############################################
# 6) CORE ENDPOINT TESTS
###############################################
echo "Testing contacts list..."
curl -s http://localhost:5000/api/crm/contacts || true

echo "Testing pipeline get stages..."
curl -s http://localhost:5000/api/pipeline/stages || true

echo "Testing lenders list..."
curl -s http://localhost:5000/api/lenders || true

echo "Testing authenticated routes with seeded admin..."
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@boreal.financial","password":"Admin123!"}' \
  > /tmp/login.json

echo "Login response:"
cat /tmp/login.json

###############################################
# 7) STOP SERVER
###############################################
echo "Stopping server..."
kill $SERVER_PID || true

###############################################
# DONE
###############################################
echo "=== BLOCK 23 COMPLETE ==="
echo "Check:"
echo "  - /tmp/boreal-local.log for startup errors"
echo "  - /tmp/health.json for build OK"
echo "  - Login response for token"
echo "If all pass → ready for Block 24 (Build & Deploy)."
