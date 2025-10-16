#!/usr/bin/env bash
set -euo pipefail

# Verify Canada products are properly represented in V1 API
BASE_URL=${1:-"http://localhost:5000"}

echo "🍁 Verifying Canadian products in V1 API..."

# Count CA products from v1 endpoint
CA_COUNT=$(curl -s "${BASE_URL}/api/v1/products" \
  | jq -r '.[].countryOffered' \
  | awk 'toupper($0)=="CA"{c++} END{print c+0}')

echo "📊 CA products found: $CA_COUNT"

# Enforce minimum threshold
MIN_CA_PRODUCTS=${MIN_CA_PRODUCTS:-10}
if [ "$CA_COUNT" -lt "$MIN_CA_PRODUCTS" ]; then
  echo "❌ FAIL: Only $CA_COUNT Canadian products found (minimum: $MIN_CA_PRODUCTS)"
  exit 1
fi

# Get geo check summary if available
if curl -s "${BASE_URL}/api/_int/geo-check" > /dev/null 2>&1; then
  echo "🌍 Geographic distribution:"
  curl -s "${BASE_URL}/api/_int/geo-check" | jq '.totals, .breakdown'
else
  echo "⚠️  Geo check endpoint not available"
fi

echo "✅ PASS: Canadian products verification successful"