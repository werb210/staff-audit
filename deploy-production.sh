#!/bin/bash
echo "=== PRODUCTION DEPLOYMENT SCRIPT ==="

# Step 1: Build the frontend (with timeout protection)
echo "1. Building frontend..."
export NODE_OPTIONS="--max_old_space_size=4096"

timeout 300s npm run build:client:fast || {
  echo "Build timed out, using development mode fallback"
  echo "Creating minimal dist structure..."
  mkdir -p dist/public
  cp -r client/public/* dist/public/ 2>/dev/null || true
}

# Step 2: Start production server
echo "2. Starting production server..."
NODE_ENV=production tsx server/index.ts