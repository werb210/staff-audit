#!/bin/bash
set -euo pipefail

echo "=== UPDATED STAFF APP TEST BLOCK ==="

BASE_URL="http://localhost:5000/api"

# Test counters
PASS_COUNT=0
FAIL_COUNT=0

pass_test() {
  echo "✅ PASS: $1"
  ((PASS_COUNT++))
}

fail_test() {
  echo "❌ FAIL: $1"
  ((FAIL_COUNT++))
}

# --- 1. Core Health ---
echo "[1] Checking core endpoints..."
curl -sf "$BASE_URL/_int/db-sanity" | jq -e '.api_tests.products_accessible == true' >/dev/null && pass_test "DB sanity check" || fail_test "DB sanity check"

# --- 2. Authentication (Dev Mode) ---
echo "[2] Testing dev authentication..."
DEV_LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/dev-login" -H "Content-Type: application/json" -d '{}' || true)
TOKEN=$(echo "$DEV_LOGIN_RESP" | jq -r .token 2>/dev/null || true)
if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  pass_test "Dev token received"
else
  fail_test "Dev token failed"
  echo "Response: $DEV_LOGIN_RESP"
fi

# --- 3. Sales Pipeline (No Auth Required) ---
echo "[3] Checking pipeline cards..."
PIPELINE_RESP=$(curl -s "$BASE_URL/pipeline/cards" || true)
CARD_COUNT=$(echo "$PIPELINE_RESP" | jq -r '.cards | length' 2>/dev/null || echo "0")
if [ "$CARD_COUNT" -gt "0" ]; then
  pass_test "Pipeline cards ($CARD_COUNT found)"
else
  fail_test "Pipeline cards"
fi

# --- 4. Documents Test ---
echo "[4] Checking documents..."
APP_ID=$(echo "$PIPELINE_RESP" | jq -r '.cards[0].id' 2>/dev/null || true)
if [ -n "$APP_ID" ] && [ "$APP_ID" != "null" ]; then
  curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/pipeline/cards/$APP_ID/documents" >/dev/null && pass_test "Documents endpoint" || fail_test "Documents endpoint"
else
  fail_test "No application ID for document test"
fi

# --- 5. Products System ---
echo "[5] Checking products..."
curl -sf "$BASE_URL/v1/products" | jq -e 'length > 0' >/dev/null && pass_test "Products available" || fail_test "Products endpoint"

# --- 6. Lenders System ---
echo "[6] Checking lenders..."
curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/lenders" >/dev/null && pass_test "Lenders endpoint" || fail_test "Lenders endpoint"

# --- 7. Settings ---
echo "[7] Checking settings..."
curl -sf "$BASE_URL/settings" >/dev/null && pass_test "Settings endpoint" || fail_test "Settings endpoint"

# --- 8. Basic API Health ---
echo "[8] Checking API routing..."
curl -sf "$BASE_URL/_int/routes" | grep -q "routes" && pass_test "Route discovery" || fail_test "Route discovery"

echo ""
echo "=== TEST SUMMARY ==="
echo "✅ PASSED: $PASS_COUNT"
echo "❌ FAILED: $FAIL_COUNT"
TOTAL=$((PASS_COUNT + FAIL_COUNT))
echo "📊 TOTAL: $TOTAL tests"

if [ $FAIL_COUNT -eq 0 ]; then
  echo "🎉 ALL TESTS PASSED!"
  exit 0
else
  echo "⚠️  Some tests failed"
  exit 1
fi