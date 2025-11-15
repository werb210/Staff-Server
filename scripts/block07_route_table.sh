#!/usr/bin/env bash
set -euo pipefail
echo "=== ROUTE TABLE ==="

grep -R "router\." -n server/src/routes || true
echo "✓ Route table generated"
