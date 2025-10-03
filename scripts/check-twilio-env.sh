#!/bin/bash
set -euo pipefail
if [ -f .env ] && grep -q "^TWILIO_" .env 2>/dev/null; then
  echo "[FAIL] .env contains Twilio secrets. Remove them and use secret manager only."
  exit 1
fi
for V in TWILIO_ACCOUNT_SID TWILIO_API_KEY_SID TWILIO_API_KEY_SECRET TWILIO_TWIML_APP_SID; do
  if ! printenv "$V" >/dev/null 2>&1; then
    echo "[FAIL] Missing required env var: $V"
    exit 1
  fi
done
echo "[OK] Twilio env variables validated. No .env leakage."
