#!/usr/bin/env bash
set -euo pipefail

echo "=== BLOCK 24: BUILD + DEPLOY TO AZURE START ==="

###############################################
# 0) VARIABLES — UPDATE IF NEEDED
###############################################
AZURE_APP_NAME="boreal-staff-server"
AZURE_RESOURCE_GROUP="boreal-production"
NODE_VERSION="20"

echo "Using:"
echo "  App: $AZURE_APP_NAME"
echo "  Resource Group: $AZURE_RESOURCE_GROUP"

echo "Checking Node version..."
NODE_ACTUAL=$(node -v | sed 's/v//')
if [[ ${NODE_ACTUAL%%.*} != "$NODE_VERSION" ]]; then
  echo "⚠️ Warning: Node version $NODE_ACTUAL detected (expected major $NODE_VERSION)"
fi

###############################################
# 1) Install server deps
###############################################
cd server
echo "Installing server dependencies..."
npm install --legacy-peer-deps

###############################################
# 2) Run TypeScript build
###############################################
echo "Running TypeScript build..."
npm run build

if [ ! -d "dist" ]; then
  echo "❌ ERROR: dist/ folder missing after build"
  exit 1
fi

echo "dist/ exists ✔"

###############################################
# 3) AZURE LOGIN CHECK
###############################################
echo "Checking Azure login..."
if ! az account show >/dev/null 2>&1; then
  echo "You are not logged in. Running az login..."
  az login --use-device-code
fi

###############################################
# 4) ZIP ARTIFACT
###############################################
echo "Preparing ZIP artifact for deployment..."
cd ..
rm -f deploy.zip

zip -r deploy.zip server/dist server/package.json server/package-lock.json server/.env \
  -x "*.ts" -x "*.md" -x "server/tests/*" >/dev/null

echo "ZIP created ✔"

###############################################
# 5) DEPLOY TO AZURE WEB APP
###############################################
echo "Deploying to Azure Web App..."
az webapp deploy \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$AZURE_APP_NAME" \
  --src-path "deploy.zip" \
  --type zip \
  --clean true

echo "Deployment upload complete ✔"

###############################################
# 6) SYNC ENVIRONMENT VARIABLES
###############################################
echo "Syncing environment variables from server/.env..."

if [ ! -f server/.env ]; then
  echo "❌ ERROR: server/.env not found"
  exit 1
fi

while IFS='=' read -r key value; do
  if [[ -n "$key" ]]; then
    az webapp config appsettings set \
      --resource-group "$AZURE_RESOURCE_GROUP" \
      --name "$AZURE_APP_NAME" \
      --settings "$key=$value" >/dev/null
  fi
done < server/.env

echo "Environment variables synced ✔"

###############################################
# 7) RESTART WEB APP
###############################################
echo "Restarting Azure Web App..."
az webapp restart \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$AZURE_APP_NAME"

echo "Restart triggered ✔"

###############################################
# 8) VERIFY LIVE HEALTH
###############################################
echo "Waiting 10 seconds for boot..."
sleep 10

APP_URL=$(az webapp show \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$AZURE_APP_NAME" \
  --query defaultHostName \
  -o tsv)

HEALTH_URL="https://${APP_URL}/api/_int/build"

echo "Checking live health at: $HEALTH_URL"

status=$(curl -s -o /tmp/live-health.json -w "%{http_code}" "$HEALTH_URL")

echo "Health HTTP status: $status"
echo "Response body:"
cat /tmp/live-health.json

if [ "$status" != "200" ]; then
  echo "❌ Deployment health check failed"
  exit 1
fi

###############################################
# DONE
###############################################
echo "=== BLOCK 24 COMPLETE: DEPLOYMENT SUCCESSFUL ==="
echo "Live URL: https://${APP_URL}"
