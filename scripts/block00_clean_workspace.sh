#!/usr/bin/env bash
set -euo pipefail
echo "=== CLEAN WORKSPACE ==="

rm -rf node_modules
rm -rf server/dist || true
rm -rf dist || true
echo "✓ Workspace cleaned"
