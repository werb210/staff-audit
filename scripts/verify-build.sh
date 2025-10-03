#!/bin/bash
set -e

echo "🧹 Cleaning previous build..."
rm -rf dist

echo "🔨 Building fresh..."
npm run build

echo "🔍 Scanning for legacy references in build..."
if grep -rn "__pipeline_legacy\|/api/.+-old" dist 2>/dev/null; then
  echo "❌ legacy made it into build"
  exit 1
else
  echo "✅ build clean"
fi

echo "🎯 Build verification completed successfully"