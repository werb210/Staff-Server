#!/bin/bash
set -e

echo "Installing dependencies..."
npm install --omit=dev

echo "Building server..."
npm run build

echo "Starting server..."
node dist/index.js
