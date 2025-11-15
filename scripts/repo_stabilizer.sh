#!/usr/bin/env bash
set -euo pipefail

echo "=== REPO STABILIZER PACK ==="

bash scripts/repo_integrity_checker.sh
bash scripts/repo_auto_fix.sh
bash scripts/azure_deploy_guard.sh
bash scripts/fs_scan.sh
bash scripts/locked_architecture_guard.sh
bash scripts/verify_server_root.sh

echo "\u2713 Repo stabilizer completed"
