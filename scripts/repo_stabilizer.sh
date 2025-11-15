#!/usr/bin/env bash
set -euo pipefail

echo "=== REPO STABILIZER — Boreal Staff Server ==="

# -------------------------------------------------------------------
# Resolve repo root
# -------------------------------------------------------------------
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

step() {
  echo ""
  echo "=== $1 ==="
}

# -------------------------------------------------------------------
step "0) VERIFY REQUIRED DIRECTORIES"

REQUIRED_DIRS=(
  "server/src"
  "server/src/controllers"
  "server/src/routes"
  "server/src/services"
  "server/src/utils"
)

for d in "${REQUIRED_DIRS[@]}"; do
  if [[ ! -d "$d" ]]; then
    echo "❌ Missing directory: $d"
    exit 1
  fi
done

echo "✓ Required directories OK"

# -------------------------------------------------------------------
step "1) VERIFY REQUIRED FILES"

REQUIRED_FILES=(
  "package.json"
  "tsconfig.json"
  "server/tsconfig.json"
  "server/src/index.ts"
)

for f in "${REQUIRED_FILES[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "❌ Missing file: $f"
    exit 1
  fi
done

echo "✓ Required files OK"

# -------------------------------------------------------------------
step "2) CLEAN INSTALL"

rm -rf node_modules
npm install --no-audit --no-fund
echo "✓ npm install OK"

# -------------------------------------------------------------------
step "3) TYPECHECK"

npm run typecheck || {
  echo "❌ TypeScript errors detected"
  exit 1
}

echo "✓ TypeScript OK"

# -------------------------------------------------------------------
step "4) BUILD"

npm run build || {
  echo "❌ Build failed"
  exit 1
}

echo "✓ Build OK"

# -------------------------------------------------------------------
step "5) INTERNAL HEALTH CHECKS"

TEST_URL="http://localhost:5000"

echo "> Booting server in background..."
npx tsx server/src/index.ts &
SERVER_PID=$!

sleep 5

curl -fsS "$TEST_URL/api/_int/health" >/dev/null && echo "✓ /health OK" || echo "❌ /health FAIL"
curl -fsS "$TEST_URL/api/_int/routes" >/dev/null && echo "✓ /routes OK" || echo "❌ /routes FAIL"
curl -fsS "$TEST_URL/api/_int/db" >/dev/null && echo "✓ /db OK" || echo "❌ /db FAIL"

kill $SERVER_PID || true

# -------------------------------------------------------------------
step "6) REPO CLEANUP — ENSURE CANONICAL SERVER STRUCTURE"

# delete legacy folders
rm -rf "Create server"
rm -rf "Create server/src"
rm -rf "server/server"
rm -rf "server/app"
rm -rf "app"
rm -rf "src"   # you explicitly authorized this deletion

echo "✓ Removed legacy/duplicate paths"

# -------------------------------------------------------------------
step "7) SUMMARY"

echo ""
echo "=== REPO STABILIZER COMPLETE ==="
echo "Everything is now aligned to /server/src"
echo ""
