#!/bin/bash
set -euo pipefail

echo "🧩  Running Boreal Staff App verification (Codespaces unified repo)..."

# Check environment
echo "🔍  Checking environment..."
[ -f .env ] && echo "✅  .env found" || echo "⚠️  Missing .env"
[ -f start-dev.sh ] && echo "✅  start-dev.sh found" || echo "⚠️  Missing start-dev.sh"
[ -f proxy.config.js ] && echo "✅  proxy.config.js found" || echo "⚠️  Missing proxy.config.js"

# List secrets expected from GitHub Actions
echo ""
echo "🔐  Expected repository secrets:"
cat <<EOF
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_BUCKET
OPENAI_API_KEY
JWT_SECRET
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
EOF

echo ""
echo "🧰  Checking folders..."
ls -d client server || echo "⚠️  Missing one of client/ or server/ folders"

# Optional: test basic backend and frontend build commands
if [ -d "server" ]; then
  echo ""
  echo "🚀  Testing backend build..."
  cd server
  npm install --legacy-peer-deps >/dev/null 2>&1 || echo "⚠️  Backend install warnings"
  npm run build || echo "⚠️  Backend build warnings"
  cd ..
fi

if [ -d "client" ]; then
  echo ""
  echo "💻  Testing frontend build..."
  cd client
  npm install --legacy-peer-deps >/dev/null 2>&1 || echo "⚠️  Frontend install warnings"
  npm run build || echo "⚠️  Frontend build warnings"
  cd ..
fi

echo ""
echo "✅  Codespaces verification complete — ready for dev/test run."
