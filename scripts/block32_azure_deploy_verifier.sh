#!/usr/bin/env bash
set -euo pipefail

echo "=== BLOCK 32 — AZURE DEPLOYMENT VERIFIER ==="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

APP_URL="https://boreal-staff-server-e4hmaqkbk2g5h9fv.canadacentral-01.azurewebsites.net"

step() {
  echo ""
  echo "=== $1 ==="
}

step "0) VERIFY REQUIRED FILES"

required_files=(
  "package.json"
  "tsconfig.json"
  "server/tsconfig.json"
  "server/src/index.ts"
)

for f in "${required_files[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "✘ Missing: $f"
    exit 1
  fi
done
echo "✔ Required files OK"

step "1) CLEAN INSTALL"
rm -rf node_modules
npm install --no-audit --no-fund
echo "✔ npm install OK"

step "2) TYPECHECK"
npm run typecheck
echo "✔ TypeScript OK"

step "3) BUILD"
npm run build
echo "✔ Build OK"

step "4) START LOCAL SERVER"
npm run start &
PID=$!
sleep 5

step "5) LOCAL HEALTH CHECK"
curl -fsSL http://localhost:5000/api/_int/health
echo "✔ Local health OK"

kill "$PID" || true

step "6) AZURE LIVE HEALTH"
curl -fsSL "$APP_URL/api/_int/health"
echo "✔ Azure health OK"

step "7) AZURE ROUTE VERIFICATION"
routes=(
  "/api/_int/health"
  "/api/_int/build"
  "/api/_int/db"
  "/api/_int/routes"
)
for r in "${routes[@]}"; do
  curl -fsSL "$APP_URL$r" > /dev/null
done
echo "✔ All Azure routes OK"

step "8) AZURE ROOT 200 CHECK"
STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$APP_URL")
if [[ "$STATUS" != "200" && "$STATUS" != "302" ]]; then
  echo "✘ Azure root returned $STATUS"
  exit 1
fi
echo "✔ Azure root reachable ($STATUS)"

echo ""
echo "=== BLOCK 32 COMPLETE — AZURE DEPLOYMENT VERIFIED ==="
