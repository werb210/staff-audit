#!/bin/bash
set -euo pipefail

echo "=== STAFF APP TEST-ONLY BLOCK ==="

BASE_URL="http://localhost:5000/api"
ADMIN_EMAIL="todd.w@boreal.financial"
ADMIN_PASS="1Sucker1!"

# --- 1. Core Health ---
echo "[1] Checking health endpoints..."
curl -sf "$BASE_URL/_int/health" || echo "FAIL: /_int/health"
curl -sf "$BASE_URL/_int/build" || echo "FAIL: /_int/build"
curl -sf "$BASE_URL/_int/routes" || echo "FAIL: /_int/routes"

# --- 2. Authentication ---
echo "[2] Testing login..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" || true)
echo "$LOGIN_RESP" | jq . || echo "FAIL: login response not JSON"
TOKEN=$(echo "$LOGIN_RESP" | jq -r .token 2>/dev/null || true)
if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "FAIL: no token returned"
else
  echo "PASS: token received"
fi

# --- 3. Sales Pipeline ---
echo "[3] Checking pipeline cards..."
curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/pipeline/cards" | jq '.[0]' || echo "FAIL: pipeline cards"

# --- 4. Documents ---
echo "[4] Checking documents for first card..."
APP_ID=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/pipeline/cards" | jq -r '.[0].id' || true)
if [ -n "$APP_ID" ] && [ "$APP_ID" != "null" ]; then
  curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/pipeline/cards/$APP_ID/documents" | jq . || echo "FAIL: documents endpoint"
  curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/documents/zip/$APP_ID" -o /tmp/docs.zip || echo "FAIL: ZIP download"
  ls -lh /tmp/docs.zip || true
else
  echo "No application ID found, skipping docs test"
fi

# --- 5. CRM Contacts ---
echo "[5] Checking CRM contacts..."
curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/crm/contacts" | jq '.[0]' || echo "FAIL: CRM contacts"

# --- 6. Communication Center ---
echo "[6] Checking communication endpoints..."
curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/communication/sms/threads" | jq '.[0]' || echo "FAIL: SMS threads"
curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/communication/calls" | jq '.[0]' || echo "FAIL: Calls"
curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/communication/email/threads" | jq '.[0]' || echo "FAIL: Email"

# --- 7. Lender System ---
echo "[7] Checking lender products..."
curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/lender-products" | jq '.[0]' || echo "FAIL: lender products"

# --- 8. OCR + AI Reports ---
echo "[8] Checking OCR insights..."
curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/ocr/insights" | jq . || echo "FAIL: OCR insights"

echo "=== TEST BLOCK COMPLETE ==="