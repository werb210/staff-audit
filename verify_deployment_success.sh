#!/bin/bash
APP_URL=${APP_URL:-https://staff.boreal.financial}
BASE="${APP_URL%/}/api"
TOK="${CLIENT_SHARED_BEARER:?missing CLIENT_SHARED_BEARER}"

echo "== VERIFYING DEPLOYMENT SUCCESS =="

# Headers must include X-DB-Host, X-Instance, Cache-Control:no-store
echo "== HEADERS CHECK =="
curl -sSI -H "Authorization: Bearer $TOK" "$BASE/v1/products" | sed -n '1,25p'

# Counts must be exact/at-least as noted
echo "== COUNTS CHECK =="
echo -n "products: " && curl -sS -H "Authorization: Bearer $TOK" "$BASE/v1/products" | jq 'length'
echo -n "lenders : " && curl -sS -H "Authorization: Bearer $TOK" "$BASE/lenders?active=true" | jq 'length'
echo -n "reqdocs : " && curl -sS -H "Authorization: Bearer $TOK" "$BASE/required-docs" | jq 'length'

echo "== EXPECTED: products=44, lenders≥30, reqdocs≥6, headers with X-DB-Host/X-Instance/Cache-Control =="