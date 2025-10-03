#!/bin/bash

echo "🧪 UUID Consistency Test Suite"
echo "=============================="
echo ""

# Test 1: Client-provided UUID
echo "Test 1: Client provides valid UUID"
UUID="auto-test-1234-5678-9abc-123456789xyz"
RESPONSE=$(curl -s -X POST "http://localhost:5000/api/public/applications" \
  -H "Content-Type: application/json" \
  -d "{
    \"applicationId\": \"$UUID\",
    \"step1\": {
      \"requestedAmount\": 80000,
      \"useOfFunds\": \"Equipment purchase\"
    },
    \"step3\": {
      \"businessName\": \"Auto Test Company\",
      \"legalBusinessName\": \"Auto Test Company LLC\"
    },
    \"step4\": {
      \"firstName\": \"Auto\",
      \"lastName\": \"Test\"
    }
  }")

echo "Response: $RESPONSE"
echo ""

# Test 2: Verify SignNow accepts same UUID
echo "Test 2: SignNow with same UUID"
SIGNNOW_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/applications/$UUID/signnow" \
  -H "Content-Type: application/json")

echo "SignNow Response: $SIGNNOW_RESPONSE"
echo ""

# Test 3: Auto-generation fallback
echo "Test 3: Auto-generation fallback (no applicationId provided)"
FALLBACK_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/public/applications" \
  -H "Content-Type: application/json" \
  -d '{
    "step1": {
      "requestedAmount": 40000,
      "useOfFunds": "Working capital"
    },
    "step3": {
      "businessName": "Fallback Test Company",
      "legalBusinessName": "Fallback Test LLC"
    },
    "step4": {
      "firstName": "Fallback",
      "lastName": "User"
    }
  }')

echo "Fallback Response: $FALLBACK_RESPONSE"
echo ""
echo "✅ UUID Consistency Test Complete"
