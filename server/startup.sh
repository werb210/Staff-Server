#!/bin/bash
set -e

cd /home/site/wwwroot/server
exec node dist/index.js
