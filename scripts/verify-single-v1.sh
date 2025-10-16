#!/usr/bin/env bash
set -euo pipefail

FILES=$(find server/routes -name "*.mjs" -o -name "*.ts" \
  | xargs grep -lE 'router\.(get|post)\(\"/api/v1/(products|lenders)\b' | sort -u)

COUNT=$(echo "$FILES" | wc -l | tr -d ' ')

if [ "$COUNT" -gt 1 ]; then
  echo "❌ Duplicate v1 route implementations detected:"
  echo "$FILES"
  exit 1
fi

echo "✅ Single-source v1 routes verified: $FILES"