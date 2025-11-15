#!/usr/bin/env bash
set -euo pipefail
echo "=== CONTROLLER SCAN ==="

grep -R "export const" -n server/src/controllers || true
grep -R "export function" -n server/src/controllers || true

echo "✓ Controller scan complete"
