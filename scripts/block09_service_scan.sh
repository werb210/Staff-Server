#!/usr/bin/env bash
set -euo pipefail
echo "=== SERVICE SCAN ==="

grep -R "export const" -n server/src/services || true
grep -R "export function" -n server/src/services || true

echo "✓ Service scan complete"
