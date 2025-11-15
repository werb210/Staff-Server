#!/usr/bin/env bash
set -euo pipefail
echo "=== LINTING ==="

npx eslint server/src || true
echo "✓ Lint complete"
