#!/usr/bin/env bash
set -e

cd /home/site/wwwroot
export PORT="${PORT:-3000}"
exec node dist/index.js
