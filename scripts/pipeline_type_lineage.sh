#!/usr/bin/env bash
set -euo pipefail

echo "=== PIPELINE TYPE LINEAGE ==="

TYPE_FILE="server/src/types/pipeline.ts"

if [[ -f "$TYPE_FILE" ]]; then
  echo "--- TYPE DEFINITIONS ---"
  sed -n '1,200p' "$TYPE_FILE"
else
  echo "✗ Missing pipeline type definitions"
fi

echo "--- PipelineRecord references ---"
grep -R "PipelineRecord" -n server/src || true

echo "--- PipelineStage references ---"
grep -R "PipelineStage" -n server/src || true

echo "✓ Type lineage complete"
