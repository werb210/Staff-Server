#!/usr/bin/env bash
set -euo pipefail

echo "=== REPO STABILIZER PACK START ==="

bash scripts/block00_clean_workspace.sh
bash scripts/block01_verify_structure.sh
bash scripts/block02_fix_imports.sh
bash scripts/block03_rebuild_node_modules.sh
bash scripts/block04_typecheck.sh
bash scripts/block05_build_server.sh
bash scripts/block06_lint.sh
bash scripts/block07_route_table.sh
bash scripts/block08_controller_scan.sh
bash scripts/block09_service_scan.sh
bash scripts/block10_env_check.sh

echo "=== REPO STABILIZER PACK COMPLETE ==="
