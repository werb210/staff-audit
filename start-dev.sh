#!/bin/bash
set -euo pipefail

# === Universal Staff App Dev Runner ===
echo "🚀 Starting Staff App (server + client in unified repo)..."

# Recreate envs if missing
[ ! -f .env ] && cat > .env <<EOF
PORT=5000
VITE_API_BASE=http://localhost:5000/api
EOF

# Run server in background
if [ -d "server" ]; then
  cd server
  npm install --legacy-peer-deps >/dev/null 2>&1
  echo "🟢 Server starting on port 5000..."
  npm run dev &
  SERVER_PID=$!
  cd ..
else
  echo "⚠️ No /server folder found — skipping backend."
fi

# Run client in foreground
if [ -d "client" ]; then
  cd client
  npm install --legacy-peer-deps >/dev/null 2>&1
  echo "🟣 Starting Vite dev server..."
  npm run dev
else
  echo "⚠️ No /client folder found — skipping frontend."
fi

wait $SERVER_PID || true
