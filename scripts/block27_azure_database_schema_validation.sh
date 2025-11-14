#!/usr/bin/env bash
set -euo pipefail

echo "=== BLOCK 27: AZURE DATABASE SCHEMA VALIDATION ==="

############################################
# 0) VARS
############################################
AZ_RG="boreal-production"
AZ_APP="boreal-staff-server"

DB_URL=$(az webapp config appsettings list \
  --resource-group "$AZ_RG" \
  --name "$AZ_APP" \
  --query "[?name=='DATABASE_URL'].value" -o tsv)

if [ -z "$DB_URL" ]; then
  echo "❌ ERROR: DATABASE_URL not found in Azure"
  exit 1
fi

echo "Connected DB:"
echo "$DB_URL"

# Output directory
mkdir -p db-validate
rm -f db-validate/*

############################################
# 1) DUMP LIVE DATABASE SCHEMA
############################################
echo "Dumping live schema…"

pg_dump \
  --schema-only \
  --no-owner \
  --no-privileges \
  "$DB_URL" > db-validate/live_schema.sql

echo "Live schema dumped → db-validate/live_schema.sql"

############################################
# 2) BUILD EXPECTED SCHEMA FROM REPO
############################################
echo "Building schema from code…"

npm install --silent

npx drizzle-kit generate:pg > /dev/null 2>&1 || true

# Schema sits inside drizzle folder, so gather everything
touch db-validate/code_schema.sql

if [ -d "drizzle" ]; then
  cat drizzle/*.sql > db-validate/code_schema.sql
else
  echo "❌ No drizzle schema folder found"
  exit 1
fi

echo "Repo schema exported → db-validate/code_schema.sql"

############################################
# 3) NORMALIZE BOTH SCHEMAS (sort + clean)
############################################
echo "Normalizing…"

sed 's/--.*//' db-validate/live_schema.sql | sed '/^$/d' | sort > db-validate/live_norm.sql
sed 's/--.*//' db-validate/code_schema.sql | sed '/^$/d' | sort > db-validate/code_norm.sql

############################################
# 4) DIFF COMPARISON
############################################
echo "Comparing schemas…"

set +e
diff -u db-validate/code_norm.sql db-validate/live_norm.sql > db-validate/schema_diff.txt
DIFF_CODE=$?
set -e

if [ "$DIFF_CODE" -eq 0 ]; then
  echo "=== BLOCK 27 PASSED — Schema is PERFECT ==="
else
  echo "❌ BLOCK 27 FAILED — SCHEMA MISMATCH DETECTED"
  echo "See: db-validate/schema_diff.txt"
fi

echo "=== BLOCK 27 DONE ==="
