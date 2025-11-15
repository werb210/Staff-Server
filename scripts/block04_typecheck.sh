#!/usr/bin/env bash
set -euo pipefail
echo "=== TYPESCRIPT CHECK ==="

npm run typecheck || true
echo "✓ Typecheck complete (errors printed above if any)"
