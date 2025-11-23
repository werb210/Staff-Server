#!/bin/bash
cd /home/site/wwwroot
npm ci --omit=dev
node dist/index.js
