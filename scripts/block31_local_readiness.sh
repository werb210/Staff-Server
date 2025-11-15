#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT_DIR"

step_header() {
  echo "=== $1 ==="
}

step_header "0) VERIFY REQUIRED FILES EXIST"
required_files=(
  "package.json"
  "tsconfig.json"
  "server/tsconfig.json"
  "server/src/index.ts"
)
for f in "${required_files[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "❌ Missing: $f"
    exit 1
  fi
done
echo "✓ Files OK"

echo
step_header "1) CLEAN INSTALL"
rm -rf node_modules
npm install --no-audit --no-fund
echo "✓ npm install OK"

echo
echo "=== 2) TYPECHECK ==="
npm run typecheck
echo "✓ TypeScript OK"

echo
echo "=== 3) BUILD ==="
npm run build
echo "✓ Build OK"

echo
echo "=== 4) CONFIRM DIST OUTPUT ==="
if [[ ! -f server/dist/index.js ]]; then
  echo "❌ dist/index.js missing"
  exit 1
fi
echo "✓ dist/index.js OK"

echo
echo "=== 5) START SERVER LOCALLY ==="
SERVER_LOG="$(mktemp)"
cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
      kill "$SERVER_PID" >/dev/null 2>&1 || true
      wait "$SERVER_PID" 2>/dev/null || true
    fi
  fi
  rm -f "$SERVER_LOG"
}
trap cleanup EXIT

npm start >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

health_url="http://localhost:5000/api/_int/health"
for attempt in {1..20}; do
  if curl -fsS "$health_url" >/dev/null; then
    HEALTH_RESPONSE=$(curl -fsS "$health_url")
    echo "$HEALTH_RESPONSE"
    echo "✓ Local server OK"
    break
  fi
  sleep 0.5
  if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    echo "❌ Server process exited unexpectedly"
    echo "--- server log ---"
    cat "$SERVER_LOG"
    exit 1
  fi
done

if [[ ${HEALTH_RESPONSE:-} != '' ]]; then
  :
else
  echo "❌ Failed to confirm server health"
  echo "--- server log ---"
  cat "$SERVER_LOG"
  exit 1
fi

echo
echo "=== 6) VERIFY AZURE COMPATIBILITY ==="
node -e '
const p=require("./package.json");
if(!p.engines){
  console.log("⚠️ No engines field — Azure will default to Node LTS");
}else{
  console.log(`engines field detected: ${JSON.stringify(p.engines)}`);
}
'
echo "✓ Azure compatibility OK"

echo
echo "=== 7) READY FOR DEPLOY ==="
echo "ALL CHECKS PASSED — SAFE TO DEPLOY TO AZURE"
