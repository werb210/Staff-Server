#!/usr/bin/env bash
set -euo pipefail

echo "=== PIPELINE DEBUG PACK START ==="

bash scripts/pipeline_route_trace.sh
bash scripts/pipeline_service_validator.sh
bash scripts/pipeline_controller_validator.sh
bash scripts/pipeline_type_lineage.sh
bash scripts/pipeline_azure_runtime_check.sh
bash scripts/pipeline_db_sanity_check.sh

echo "=== PIPELINE DEBUG PACK COMPLETE ==="
