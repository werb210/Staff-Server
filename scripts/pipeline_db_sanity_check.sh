#!/usr/bin/env bash
set -euo pipefail

echo "=== DB SANITY CHECK ==="

DB_SERVICE="server/src/services/db.ts"

if [[ ! -f "$DB_SERVICE" ]]; then
  echo "✗ Missing DB service"
  exit 1
fi

echo "--- Pipeline DB structures ---"
grep -R "pipeline" -n server/src/services || true

echo "--- DB Describe ---"
node - <<'NODE'
import { describeDatabaseUrl } from "./server/src/utils/env.js";
console.log(describeDatabaseUrl(process.env.DATABASE_URL));
NODE

echo "✓ DB sanity check complete"
