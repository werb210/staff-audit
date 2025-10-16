#!/usr/bin/env bash
set -euo pipefail

export PORT="${PORT:-5000}"
export HOST="${HOST:-0.0.0.0}"
export NODE_ENV="${NODE_ENV:-development}"

echo "🚀 Starting Boreal Financial Staff Platform..."
echo "Environment: $NODE_ENV"
echo "Binding to: $HOST:$PORT"

# Try different startup methods in order of preference
if npx tsx --version >/dev/null 2>&1; then
    echo "Using npx tsx to start server/index.ts"
    npx tsx server/index.ts
elif [ -f "./node_modules/.bin/tsx" ]; then
    echo "Using local tsx binary"
    ./node_modules/.bin/tsx server/index.ts
else
    echo "tsx not available, using safe server fallback"
    node server/bootstrap/safe-server.cjs
fi
