#!/usr/bin/env bash
set -euo pipefail

echo "=== FILE SYSTEM SCAN ==="

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"

echo "Scanning for duplicate TS/JS files…"
dupes=$(find server/src -type f | sed 's/\.[^.]*$//' | sort | uniq -d || true)

if [[ -n "$dupes" ]]; then
  echo "\u2717 Duplicate base names found:"
  echo "$dupes"
  exit 1
fi

echo "\u2713 No duplicate file bases detected"
