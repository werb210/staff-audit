#!/bin/bash
set -euo pipefail

echo "=== STAFF APP TEST-ONLY + DEDUP REPORT ==="

BASE_URL="http://localhost:5000/api"
ADMIN_EMAIL="todd.w@boreal.financial"
ADMIN_PASS="1Sucker1!"

# Temporary file for results
REPORT_FILE="/tmp/staff_test_report.txt"
SUMMARY_FILE="/tmp/staff_test_summary.txt"
rm -f "$REPORT_FILE" "$SUMMARY_FILE"

record_result() {
  local test_name="$1"
  local status="$2"
  echo "$status: $test_name" | tee -a "$REPORT_FILE"
}

# --- 1. Core Health ---
echo "[1] Checking health endpoints..."
for ep in "_int/health" "_int/build" "_int/routes"; do
  if curl -sf "$BASE_URL/$ep" >/dev/null; then
    record_result "$ep" "PASS"
  else
    record_result "$ep" "FAIL"
  fi
done

# --- 2. Authentication ---
echo "[2] Testing login..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" || true)

TOKEN=$(echo "$LOGIN_RESP" | jq -r .token 2>/dev/null || true)
if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  record_result "auth/login" "FAIL"
else
  record_result "auth/login" "PASS"
fi

# --- 3. Sales Pipeline ---
echo "[3] Checking pipeline cards..."
if curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/pipeline/cards" >/dev/null; then
  record_result "pipeline/cards" "PASS"
else
  record_result "pipeline/cards" "FAIL"
fi

# --- 4. Documents ---
echo "[4] Checking documents..."
APP_ID=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/pipeline/cards" | jq -r '.[0].id' || true)
if [ -n "$APP_ID" ] && [ "$APP_ID" != "null" ]; then
  if curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/pipeline/cards/$APP_ID/documents" >/dev/null; then
    record_result "pipeline/cards/:id/documents" "PASS"
  else
    record_result "pipeline/cards/:id/documents" "FAIL"
  fi
  if curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/documents/zip/$APP_ID" -o /tmp/docs.zip; then
    record_result "documents/zip/:id" "PASS"
  else
    record_result "documents/zip/:id" "FAIL"
  fi
else
  record_result "documents (no app id)" "FAIL"
fi

# --- 5. CRM Contacts ---
echo "[5] Checking CRM contacts..."
if curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/crm/contacts" >/dev/null; then
  record_result "crm/contacts" "PASS"
else
  record_result "crm/contacts" "FAIL"
fi

# --- 6. Communication Center ---
echo "[6] Checking communication..."
for ep in "communication/sms/threads" "communication/calls" "communication/email/threads"; do
  if curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/$ep" >/dev/null; then
    record_result "$ep" "PASS"
  else
    record_result "$ep" "FAIL"
  fi
done

# --- 7. Lender System ---
echo "[7] Checking lender products..."
if curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/lender-products" >/dev/null; then
  record_result "lender-products" "PASS"
else
  record_result "lender-products" "FAIL"
fi

# --- 8. OCR + AI Reports ---
echo "[8] Checking OCR insights..."
if curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/ocr/insights" >/dev/null; then
  record_result "ocr/insights" "PASS"
else
  record_result "ocr/insights" "FAIL"
fi

echo
echo "=== RAW RESULTS ==="
cat "$REPORT_FILE"

echo
echo "=== DEDUPED SUMMARY ==="
awk '{print $2": "$1}' "$REPORT_FILE" | sort | uniq -c | awk '{print "Count=" $1, $2, $3}' | tee "$SUMMARY_FILE"

echo
echo "=== TOTALS ==="
TOTAL=$(wc -l < "$REPORT_FILE")
FAILS=$(grep -c FAIL "$REPORT_FILE" || true)
PASSES=$(grep -c PASS "$REPORT_FILE" || true)
echo "Total tests: $TOTAL"
echo "Pass: $PASSES"
echo "Fail: $FAILS"

echo
echo "=== JSON EXPORT ==="
JSON_FILE="/tmp/staff_test_results.json"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
SUCCESS_RATE=$(( PASSES * 100 / TOTAL ))

# Build JSON report
cat > "$JSON_FILE" << EOF
{
  "timestamp": "$TIMESTAMP",
  "test_run_summary": {
    "total_tests": $TOTAL,
    "passes": $PASSES,
    "fails": $FAILS,
    "success_rate": $SUCCESS_RATE
  },
  "endpoints": [
EOF

# Add individual endpoint results
FIRST=true
while IFS=': ' read -r status endpoint; do
  if [ "$FIRST" = true ]; then
    FIRST=false
  else
    echo "," >> "$JSON_FILE"
  fi
  echo "    {\"endpoint\": \"$endpoint\", \"status\": \"$status\"}" >> "$JSON_FILE"
done < "$REPORT_FILE"

cat >> "$JSON_FILE" << EOF
  ],
  "failed_endpoints": [
EOF

# Add failed endpoints list
FIRST=true
while IFS=': ' read -r status endpoint; do
  if [ "$status" = "FAIL" ]; then
    if [ "$FIRST" = true ]; then
      FIRST=false
    else
      echo "," >> "$JSON_FILE"
    fi
    echo "    \"$endpoint\"" >> "$JSON_FILE"
  fi
done < "$REPORT_FILE"

cat >> "$JSON_FILE" << EOF
  ],
  "system_status": "$(if [ $FAILS -eq 0 ]; then echo "FULLY_OPERATIONAL"; elif [ $PASSES -gt $FAILS ]; then echo "MOSTLY_WORKING"; else echo "CRITICAL_ISSUES"; fi)"
}
EOF

echo "JSON results exported to: $JSON_FILE"
cat "$JSON_FILE"