#!/usr/bin/env bash
set -euo pipefail

npm run build || exit 1
curl -f http://localhost:8080/health || exit 1

echo "predeploy passed"
