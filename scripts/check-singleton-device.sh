#!/bin/bash
set -euo pipefail
VIOLATIONS=$(grep -rn "new Device(" client/src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "client/src/lib/twilioDevice.ts" || true)
if [ -n "$VIOLATIONS" ]; then
  echo "[FAIL] Found instances of 'new Device()' outside twilioDevice.ts:"
  echo "$VIOLATIONS"
  exit 1
fi
echo "[OK] Singleton pattern enforced - all Device() calls in twilioDevice.ts only."
