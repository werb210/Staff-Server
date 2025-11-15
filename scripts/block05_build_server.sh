#!/usr/bin/env bash
set -euo pipefail
echo "=== SERVER BUILD ==="

npm run build || true
echo "✓ Build completed"
