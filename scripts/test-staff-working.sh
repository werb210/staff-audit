#!/bin/bash
set -euo pipefail

echo "=== STAFF APP TEST-ONLY BLOCK (WORKING VERSION) ==="

BASE_URL="http://localhost:5000/api"

# --- 1. Core Health (Updated endpoints) ---
echo "[1] Checking health endpoints..."
curl -sf "$BASE_URL/_int/db-sanity" && echo "PASS: db-sanity" || echo "FAIL: /_int/db-sanity"
curl -sf "$BASE_URL/_int/routes" && echo "PASS: routes" || echo "FAIL: /_int/routes"

# --- 2. Authentication (Dev Mode) ---
echo "[2] Testing dev authentication..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/dev-login" \
  -H "Content-Type: application/json" \
  -d "{}" || true)
echo "$LOGIN_RESP" | jq . > /dev/null 2>&1 && echo "PASS: login response JSON" || echo "FAIL: login response not JSON"
TOKEN=$(echo "$LOGIN_RESP" | jq -r .token 2>/dev/null || true)
if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "FAIL: no token returned"
else
  echo "PASS: token received"
fi

# --- 3. Sales Pipeline (No auth required) ---
echo "[3] Checking pipeline cards..."
PIPELINE_RESP=$(curl -s "$BASE_URL/pipeline/cards" || true)
echo "$PIPELINE_RESP" | jq '.cards[0]' > /dev/null 2>&1 && echo "PASS: pipeline cards" || echo "FAIL: pipeline cards"

# --- 4. Documents ---
echo "[4] Checking documents for first card..."
APP_ID=$(echo "$PIPELINE_RESP" | jq -r '.cards[0].id' 2>/dev/null || true)
if [ -n "$APP_ID" ] && [ "$APP_ID" != "null" ]; then
  curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/pipeline/cards/$APP_ID/documents" > /dev/null && echo "PASS: documents endpoint" || echo "FAIL: documents endpoint"
else
  echo "FAIL: No application ID found for docs test"
fi

# --- 5. Products System ---
echo "[5] Checking product catalog..."
curl -sf "$BASE_URL/v1/products" | jq 'length' > /dev/null && echo "PASS: products catalog" || echo "FAIL: products catalog"

# --- 6. Settings System ---
echo "[6] Checking settings..."
curl -sf "$BASE_URL/settings" > /dev/null && echo "PASS: settings API" || echo "FAIL: settings API"

# --- 7. Lender System (with auth) ---
echo "[7] Checking lenders..."
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/lenders" > /dev/null && echo "PASS: lenders API" || echo "FAIL: lenders API"
else
  echo "FAIL: No token for lenders test"
fi

# --- 8. AI/OCR Systems ---
echo "[8] Checking AI services..."
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/ai" > /dev/null && echo "PASS: AI services" || echo "FAIL: AI services"
else
  echo "FAIL: No token for AI test"  
fi

echo "=== TEST BLOCK COMPLETE ==="