#!/usr/bin/env bash
set -euo pipefail

echo "=== VERIFY PROJECT STRUCTURE ==="

required=( 
  "package.json"
  "server/src/index.ts"
  "server/src/routes"
  "server/src/controllers"
  "server/src/services"
  "server/tsconfig.json"
)

for f in "${required[@]}"; do
  if [[ ! -e "$f" ]]; then
    echo "✗ Missing: $f"
    exit 1
  else
    echo "✓ Found: $f"
  fi
done

echo "✓ Structure OK"
