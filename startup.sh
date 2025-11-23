#!/usr/bin/env bash
set -euo pipefail

# Azure strips executable permissions — restore them
chmod +x /home/site/wwwroot/startup.sh || true

echo "== STARTING STAFF SERVER =="

# Helpful diagnostics
echo "PWD: $(pwd)"
echo "Node version: $(node -v)"
ls -al /home/site/wwwroot || true

# Launch the server using absolute path (Azure changes working dir)
node /home/site/wwwroot/dist/index.js
