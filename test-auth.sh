#!/bin/bash
echo "Testing Twilio Verify-only Authentication System..."

# Test OTP request
echo "1. Requesting OTP for admin user..."
curl -s -X POST "http://localhost:5000/auth/request-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+15878881837"}' | jq .

# Test OTP verification with dev bypass
echo "2. Verifying OTP with dev bypass code..."
TOKEN_RESPONSE=$(curl -s -X POST "http://localhost:5000/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+15878881837", "code":"111111"}')

echo "Response: $TOKEN_RESPONSE"

TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Authentication failed - no token received"
  exit 1
fi

echo "✅ Token received: ${TOKEN:0:20}..."

# Test authenticated API calls
echo "3. Testing authenticated API endpoints..."

echo "  - Testing /api/contacts..."
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/contacts" | jq .

echo "  - Testing /api/pipeline..."
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/pipeline" | jq .

echo "  - Testing /api/lenders/metrics..."
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/lenders/metrics" | jq .

echo "4. Testing document endpoints..."
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5000/api/documents" | jq .

echo "✅ All API tests completed!"