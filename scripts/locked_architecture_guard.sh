#!/usr/bin/env bash
set -euo pipefail

echo "=== ARCHITECTURE LOCK GUARD ==="

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"

if [[ -d "src" ]]; then
  echo "\u2717 ERROR: Top-level /src folder is not allowed. Must use /server/src only."
  exit 1
fi

echo "\u2713 Architecture layout is correct"
