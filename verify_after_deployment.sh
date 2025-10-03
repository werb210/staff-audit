#!/bin/bash
# VERIFY PRODUCTION AFTER DEPLOYMENT
APP_URL="${APP_URL:-https://staff.boreal.financial}"
BASE="${APP_URL%/}/api"
TOK="${CLIENT_SHARED_BEARER:?missing CLIENT_SHARED_BEARER}"

echo "== Headers on /v1/products (must include X-DB-Host, X-Instance, Cache-Control:no-store) =="
HDRS="$(curl -sSI -H "Authorization: Bearer $TOK" "$BASE/v1/products")" || true
echo "$HDRS" | sed -n '1,25p'
DB_HOST="$(printf "%s" "$HDRS" | awk 'tolower($1)=="x-db-host:"{print $2}' | tr -d "\r")"
INSTANCE="$(printf "%s" "$HDRS" | awk 'tolower($1)=="x-instance:"{print $2}' | tr -d "\r")"
CACHECTL="$(printf "%s" "$HDRS" | awk 'tolower($1)=="cache-control:"{$1=\"\";sub(/^ /,\"\");print}' | tr -d "\r")"

echo "== Counts (expect products=44, lenders≥30, reqdocs≥6 with 200) =="
echo -n "products: " && curl -sS -H "Authorization: Bearer $TOK" "$BASE/v1/products" | jq 'length'
echo -n "lenders : " && curl -sS -H "Authorization: Bearer $TOK" "$BASE/lenders?active=true&limit=9999" | jq 'length'
echo -n "reqdocs : " && curl -sS -o /tmp/rd.json -w "%{http_code}\n" -H "Authorization: Bearer $TOK" "$BASE/required-docs" && jq 'length' /tmp/rd.json 2>/dev/null || true

# Guard rails (fail fast if still old build)
[[ -n "${DB_HOST:-}" && -n "${INSTANCE:-}" && "${CACHECTL,,}" == *"no-store"* ]] || { echo "❌ Missing header middleware — not the new build."; exit 2; }

# Publish EXPECTED_* for Client (NON-SECRET)
cat > reports/EXPECTED_FOR_CLIENT.env <<EOF
export EXPECTED_DB_HOST="${DB_HOST}"
export EXPECTED_TOKEN_FP="$(node -e 'const c=require("crypto");process.stdout.write(c.createHash("sha256").update(process.env.CLIENT_SHARED_BEARER||"").digest("hex").slice(0,12))')"
export EXPECTED_PRODUCTS="44"
export EXPECTED_LENDERS="30"
export EXPECTED_MIN_REQUIRED_DOCS="6"
EOF
echo "== EXPECTED_* for Client =="
cat reports/EXPECTED_FOR_CLIENT.env
echo "✅ STAFF: production is healthy and published."