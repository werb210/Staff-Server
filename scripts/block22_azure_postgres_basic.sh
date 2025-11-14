#!/usr/bin/env bash
set -euo pipefail

echo "=== BLOCK 22: Azure Postgres (Basic Tier) + Prisma Migration ==="

###############################################
# 0) REQUIRE AZ CLI LOGIN
###############################################
echo "Logging into Azure..."
az account show >/dev/null 2>&1 || az login

###############################################
# 1) VARIABLES — UPDATE ONLY IF YOU WANT NEW NAMES
###############################################
RESOURCE_GROUP="boreal-staff-rg"
LOCATION="canadacentral"
DB_SERVER_NAME="boreal-pg-basic-$(openssl rand -hex 2)"
DB_NAME="boreal"
ADMIN_USER="borealadmin"
ADMIN_PASS="$(openssl rand -hex 16)"

echo "RESOURCE_GROUP=$RESOURCE_GROUP"
echo "DB_SERVER_NAME=$DB_SERVER_NAME"
echo "DB_NAME=$DB_NAME"
echo "ADMIN_USER=$ADMIN_USER"
echo "ADMIN_PASS=$ADMIN_PASS"

###############################################
# 2) CREATE RESOURCE GROUP (idempotent)
###############################################
echo "Creating resource group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  >/dev/null

###############################################
# 3) CREATE FLEXIBLE SERVER — BASIC TIER
###############################################
echo "Creating Azure Postgres Flexible Server (Basic Tier)..."
az postgres flexible-server create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER_NAME" \
  --location "$LOCATION" \
  --tier "Burstable" \
  --sku-name "B_Standard_B1ms" \
  --storage-size 32 \
  --version "16" \
  --admin-user "$ADMIN_USER" \
  --admin-password "$ADMIN_PASS" \
  --yes \
  >/dev/null

###############################################
# 4) ENABLE PUBLIC ACCESS FOR THIS CODESPACE IP
###############################################
MY_IP=$(curl -s ifconfig.me)
echo "Allowing public access for your IP: $MY_IP"

az postgres flexible-server firewall-rule create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$DB_SERVER_NAME" \
  --rule-name "codespace-access" \
  --start-ip-address "$MY_IP" \
  --end-ip-address "$MY_IP" \
  >/dev/null

###############################################
# 5) CREATE DATABASE
###############################################
echo "Creating database '$DB_NAME'..."
az postgres flexible-server db create \
  --resource-group "$RESOURCE_GROUP" \
  --server-name "$DB_SERVER_NAME" \
  --database-name "$DB_NAME" \
  >/dev/null

###############################################
# 6) GENERATE DATABASE_URL + WRITE TO .env
###############################################
DB_HOST="${DB_SERVER_NAME}.postgres.database.azure.com"
DATABASE_URL="postgresql://${ADMIN_USER}:${ADMIN_PASS}@${DB_HOST}:5432/${DB_NAME}?sslmode=require"

echo "Writing DATABASE_URL to server/.env ..."
cat > server/.env <<EOF_ENV
NODE_ENV=production
DATABASE_URL="${DATABASE_URL}"
EOF_ENV

###############################################
# 7) PRISMA GENERATE + MIGRATE
###############################################
echo "Running Prisma generate..."
cd server
npx prisma generate

echo "Running Prisma migrate..."
npx prisma migrate deploy

###############################################
# 8) VERIFY TABLE STRUCTURE
###############################################
echo "Verifying Postgres tables..."
psql "$DATABASE_URL" -c "\\dt" || true

###############################################
# 9) SEED SILOS + ADMIN USER
###############################################
echo "Creating seed admin + silos..."
psql "$DATABASE_URL" <<EOF_SQL
INSERT INTO "Silo" (id, name) VALUES
  ('bf', 'BF'),
  ('bi', 'BI'),
  ('slf', 'SLF')
ON CONFLICT DO NOTHING;

INSERT INTO "User" (id, email, password, role, "allowedSilos")
VALUES (
  gen_random_uuid(),
  'admin@boreal.financial',
  '\$2b\$10\$hE7H615NqDG9yhjNoSUQUuPlfHfN7O255MHhFZJ6FmQ6Dp5zsxFrK',  -- password: Admin123!
  'ADMIN',
  ARRAY['bf','bi','slf']
)
ON CONFLICT DO NOTHING;
EOF_SQL

###############################################
# DONE
###############################################
echo "=== BLOCK 22 COMPLETE ==="
echo "DB CREATED: $DB_HOST"
echo "ADMIN LOGIN: admin@boreal.financial / Admin123!"
echo "Ready for BLOCK 23 (Local Runtime Verification)."
