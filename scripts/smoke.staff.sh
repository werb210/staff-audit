#!/usr/bin/env bash
set -euo pipefail

BASE="${APP_URL:-https://staff.boreal.financial}"
API="$BASE/api"
TOK="${CLIENT_SHARED_BEARER:-}"

[ -n "$TOK" ] || { echo "❌ CLIENT_SHARED_BEARER is not set"; exit 1; }
pp(){ echo; echo "--- $1 ---"; }

pp "Build/health"
curl -sS "$API/_int/build" | jq '.' || true

pp "CORS preflight (lenders)"
curl -sI -X OPTIONS \
  -H "Origin: https://client.boreal.financial" \
  -H "Access-Control-Request-Method: GET" \
  "$API/lenders" | sed -n '1,20p'

pp "Products (expect 44)"
curl -sS -H "Authorization: Bearer $TOK" "$API/v1/products" | jq 'length'

pp "Lenders (expect 30)"
curl -sS -H "Authorization: Bearer $TOK" "$API/lenders" | jq 'length'

pp "Validate-intake (old schema → expect JSON, 200 or 400)"
curl -sS -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -X POST "$API/applications/validate-intake" \
  -d '{"product_id":"PRODUCT_ID","country":"US","amount":25000}' | jq '.'

pp "Validate-intake (new schema → expect JSON, 200 or 400)"
curl -sS -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -X POST "$API/applications/validate-intake" \
  -d '{"business":{"name":"Co"}, "owners":[{"name":"A"}], "amountRequested":50000}' | jq '.'

echo; echo "✅ Staff smoke complete"