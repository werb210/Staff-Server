#!/usr/bin/env bash
set -euo pipefail

echo "=== VERIFY SERVER ROOT ==="

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"

if [[ ! -f "server/src/index.ts" ]]; then
  echo "\u2717 Missing server/src/index.ts"
  exit 1
fi

if [[ ! -f "server/tsconfig.json" ]]; then
  echo "\u2717 Missing server/tsconfig.json"
  exit 1
fi

echo "\u2713 server/src root verified"
