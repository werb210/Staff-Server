#!/usr/bin/env bash
set -e

echo ">>> Building TypeScript"
npm run build

echo ">>> Starting server"
node dist/src/index.js
