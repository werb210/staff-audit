#!/usr/bin/env bash
set -euo pipefail
BASE_URL="https://staff.boreal.financial/api"
TOKEN="${STAFF_JWT_TOKEN:-}"
echo "=== Boreal Staff API minimal verification ==="

test_ep() {
  local ep="$1"
  code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$BASE_URL/$ep" || true)
  echo "$ep → $code"
}

# CRM & Pipeline
for ep in contacts pipeline/cards pipeline/cards/TEST_ID/application pipeline/cards/TEST_ID/documents; do test_ep "$ep"; done

# Integrations
for ep in _int/twilio-check _int/o365/health _int/sendgrid _int/linkedin _int/ga4; do test_ep "$ep"; done

echo "✅ Minimal check finished."
