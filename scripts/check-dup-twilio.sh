#!/bin/bash
set -euo pipefail
DUP_ROUTES=$(grep -r "router.get.*['\"/]token" server/routes 2>/dev/null | grep -i twilio | wc -l)
if [ "$DUP_ROUTES" -gt 1 ]; then
  echo "[FAIL] Multiple Twilio token routes found ($DUP_ROUTES). Only one allowed."
  exit 1
fi
echo "[OK] Single Twilio token route confirmed."
