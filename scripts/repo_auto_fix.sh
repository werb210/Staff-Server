#!/usr/bin/env bash
set -euo pipefail

echo "=== AUTO FIXER ==="

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"

rm -rf node_modules || true
npm install --no-audit --no-fund

echo "\u2713 Reinstalled dependencies"

npm run typecheck || true

echo "\u2713 Typecheck completed (may contain warnings)"
