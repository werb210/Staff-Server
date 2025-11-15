#!/usr/bin/env bash
set -euo pipefail

echo "=== REPO INTEGRITY CHECK ==="

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"

required_directories=(
  "server"
  "server/src"
  "server/prisma"
  "scripts"
)

required_files=(
  "package.json"
  "server/tsconfig.json"
  "server/src/index.ts"
  "Dockerfile"
  ".env"
)

for d in "${required_directories[@]}"; do
  if [[ ! -d "$d" ]]; then
    echo "\u2717 Missing directory: $d"
    exit 1
  fi
done

for f in "${required_files[@]}"; do
  if [[ ! -f "$f" ]]; then
    echo "\u2717 Missing file: $f"
    exit 1
  fi
done

echo "\u2713 Repo integrity OK"
