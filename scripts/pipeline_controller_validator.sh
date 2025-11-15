#!/usr/bin/env bash
set -euo pipefail

echo "=== PIPELINE CONTROLLER VALIDATOR ==="

CONTROLLER_FILE="server/src/controllers/pipelineController.ts"

if [[ ! -f "$CONTROLLER_FILE" ]]; then
  echo "✗ Missing: $CONTROLLER_FILE"
  exit 1
fi

echo "--- EXPORTS ---"
grep -E "export (const|function)" -n "$CONTROLLER_FILE"

echo "--- pipelineService usage ---"
grep -R "pipelineService" -n "$CONTROLLER_FILE" || echo "✗ Missing pipelineService import"

echo "✓ Controller validator complete"
