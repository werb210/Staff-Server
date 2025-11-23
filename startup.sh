#!/usr/bin/env bash
set -euo pipefail

echo "== STARTING STAFF SERVER =="

# Absolute path launch (Azure safe)
if [ -f "/home/site/wwwroot/dist/index.js" ]; then
  node /home/site/wwwroot/dist/index.js
else
  echo "FATAL: dist/index.js not found."
  ls -lah /home/site/wwwroot
  ls -lah /home/site/wwwroot/dist || true
  exit 1
fi
