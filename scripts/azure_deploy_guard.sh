#!/usr/bin/env bash
set -euo pipefail

echo "=== AZURE DEPLOYMENT GUARD ==="

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
cd "$ROOT"

required_envs=("DATABASE_URL" "JWT_SECRET")

for key in "${required_envs[@]}"; do
  if [[ -z "${!key:-}" ]]; then
    echo "\u2717 Missing required env var: $key"
    exit 1
  fi
done

echo "\u2713 Env vars OK"

curl -sSf https://boreal-staff-server-e4hmaqkbk2g5h9fv.canadacentral-01.azurewebsites.net/api/_int/health >/dev/null
echo "\u2713 Azure health route OK"

curl -sSf https://boreal-staff-server-e4hmaqkbk2g5h9fv.canadacentral-01.azurewebsites.net/api/_int/routes >/dev/null
echo "\u2713 Azure routes OK"

echo "\u2713 Azure deploy guard clear"
