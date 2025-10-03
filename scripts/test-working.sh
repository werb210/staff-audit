#!/bin/bash
set -euo pipefail

echo "🚀 STAFF APP PRODUCTION VERIFICATION TEST"
echo "=========================================="

BASE_URL="http://localhost:5000"
API_URL="$BASE_URL/api"

PASS=0
FAIL=0

test_endpoint() {
  local name="$1"
  local url="$2"
  local expected="$3"
  
  echo -n "Testing $name... "
  
  if curl -s -f "$url" | grep -q "$expected"; then
    echo "✅ PASS"
    ((PASS++))
  else
    echo "❌ FAIL"
    ((FAIL++))
  fi
}

test_json_endpoint() {
  local name="$1"
  local url="$2"
  
  echo -n "Testing $name... "
  
  if curl -s -f "$url" | jq . >/dev/null 2>&1; then
    echo "✅ PASS"
    ((PASS++))
  else
    echo "❌ FAIL"
    ((FAIL++))
  fi
}

echo ""
echo "1️⃣  CORE SYSTEM HEALTH"
echo "----------------------"
test_json_endpoint "Database Sanity" "$API_URL/_int/db-sanity"
test_endpoint "Route Discovery" "$API_URL/_int/routes" "routes"

echo ""
echo "2️⃣  AUTHENTICATION SYSTEM"
echo "-------------------------"
echo -n "Getting dev authentication token... "
DEV_TOKEN=$(curl -s -X POST "$API_URL/auth/dev-login" | jq -r '.token // empty' 2>/dev/null || echo "")
if [ -n "$DEV_TOKEN" ] && [ "$DEV_TOKEN" != "null" ]; then
  echo "✅ PASS"
  ((PASS++))
else
  echo "❌ FAIL"
  ((FAIL++))
fi

echo ""
echo "3️⃣  SALES PIPELINE SYSTEM"
echo "-------------------------"
test_json_endpoint "Pipeline Cards" "$API_URL/pipeline/cards"

echo ""
echo "4️⃣  PRODUCT CATALOG"
echo "-------------------"
test_json_endpoint "V1 Products" "$API_URL/v1/products"

echo ""
echo "5️⃣  SYSTEM CONFIGURATION"
echo "------------------------"
test_json_endpoint "Settings" "$API_URL/settings"

echo ""
echo "6️⃣  LENDER INTEGRATIONS"
echo "----------------------"
if [ -n "$DEV_TOKEN" ]; then
  echo -n "Testing Lenders API... "
  if curl -s -H "Authorization: Bearer $DEV_TOKEN" "$API_URL/lenders" | jq . >/dev/null 2>&1; then
    echo "✅ PASS"
    ((PASS++))
  else
    echo "❌ FAIL"
    ((FAIL++))
  fi
else
  echo "❌ SKIP: No auth token"
  ((FAIL++))
fi

echo ""
echo "7️⃣  FRONTEND DELIVERY"
echo "--------------------"
test_endpoint "Main App HTML" "$BASE_URL/" "<!doctype html>"
test_endpoint "CSS Assets" "$BASE_URL/assets/index-awvBLb4C.css" "@tailwind"

echo ""
echo "📊 TEST RESULTS SUMMARY"
echo "======================="
echo "✅ PASSED: $PASS tests"
echo "❌ FAILED: $FAIL tests"
echo "📈 SUCCESS RATE: $(( PASS * 100 / (PASS + FAIL) ))%"

if [ $FAIL -eq 0 ]; then
  echo ""
  echo "🎉 ALL SYSTEMS OPERATIONAL!"
  echo "🚀 Staff portal is ready for production use"
  exit 0
else
  echo ""
  echo "⚠️  Some systems need attention"
  exit 1
fi