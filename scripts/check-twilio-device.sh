#!/bin/bash
set -euo pipefail
FILES=$(grep -rl "new Device(" client/src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "client/src/lib/twilioDevice.ts" || true)
if [ -n "$FILES" ]; then
  echo "[FAIL] new Device() used outside twilioDevice.ts:"
  echo "$FILES"
  exit 1
fi
echo "[OK] Device only initialized in client/src/lib/twilioDevice.ts"
