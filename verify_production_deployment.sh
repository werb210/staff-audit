#!/bin/bash
# PRODUCTION DEPLOYMENT VERIFICATION SCRIPT
APP_URL=${APP_URL:-https://staff.boreal.financial}
BASE="$APP_URL/api"
TOK="${CLIENT_SHARED_BEARER:?missing CLIENT_SHARED_BEARER}"

echo "== Headers =="
curl -sSI -H "Authorization: Bearer $TOK" "$BASE/v1/products" | sed -n '1,25p'

echo "== Counts =="
echo -n "products: " && curl -sS -H "Authorization: Bearer $TOK" "$BASE/v1/products" | jq 'length'
echo -n "lenders : " && curl -sS -H "Authorization: Bearer $TOK" "$BASE/lenders?active=true" | jq 'length'
echo -n "reqdocs : " && curl -sS -o /tmp/rd.json -w "%{http_code}\n" -H "Authorization: Bearer $TOK" "$BASE/required-docs" && jq 'length' /tmp/rd.json 2>/dev/null || true

echo ""
echo "== EXPECTED FOR SUCCESSFUL DEPLOYMENT =="
echo "- Response headers include: X-DB-Host, X-Instance, Cache-Control: no-store"
echo "- products=44, lenders≥30, reqdocs≥6 with HTTP 200"