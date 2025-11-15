#!/usr/bin/env bash
set -euo pipefail
echo "=== FIX IMPORT EXTENSIONS ==="

find server/src -type f -name "*.ts" -print0 | while IFS= read -r -d '' f; do
  sed -i 's#from "\(.*\)\.js"#from "\1"#g' "$f"
done

echo "✓ Imports cleaned"
