#!/usr/bin/env bash
set -euo pipefail
echo "=== ENV VALIDATION ==="

required_vars=( "DATABASE_URL" "JWT_SECRET" )

for v in "${required_vars[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    echo "✗ Missing ENV: $v"
    exit 1
  else
    echo "✓ $v OK"
  fi
done

echo "✓ ENV check OK"
