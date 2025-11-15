#!/usr/bin/env bash
set -euo pipefail

echo "=== PIPELINE SERVICE VALIDATOR ==="

SERVICE_FILE="server/src/services/pipelineService.ts"

if [[ ! -f "$SERVICE_FILE" ]]; then
  echo "✗ Missing: $SERVICE_FILE"
  exit 1
fi

echo "--- EXPORTS ---"
grep -E "export (const|function|class)" -n "$SERVICE_FILE" || true

required=( "db" "Silo" "createCard" "moveCard" "getCardsForSilo" )

for key in "${required[@]}"; do
  if grep -q "$key" "$SERVICE_FILE"; then
    echo "✓ $key OK"
  else
    echo "✗ Missing: $key"
  fi
done

echo "✓ Pipeline service validator complete"
