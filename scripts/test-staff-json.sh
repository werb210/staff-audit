#!/bin/bash
set -euo pipefail

echo "=== STAFF APP TEST-ONLY + DEDUP REPORT + JSON EXPORT ==="

BASE_URL="http://localhost:5000/api"
ADMIN_EMAIL="todd.w@boreal.financial"
ADMIN_PASS="1Sucker1!"

REPORT_FILE="/tmp/staff_test_report.txt"
SUMMARY_FILE="/tmp/staff_test_summary.txt"
JSON_FILE="/tmp/staff_test_results.json"
rm -f "$REPORT_FILE" "$SUMMARY_FILE" "$JSON_FILE"

record_result() {
  local test_name="$1"
  local status="$2"
  echo "$status: $test_name" | tee -a "$REPORT_FILE"
}

# --- 1. Core Health ---
for ep in "_int/health" "_int/build" "_int/routes"; do
  if curl -sf "$BASE_URL/$ep" >/dev/null; then
    record_result "$ep" "PASS"
  else
    record_result "$ep" "FAIL"
  fi
done

# --- 2. Authentication ---
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" || true)

TOKEN=$(echo "$LOGIN_RESP" | jq -r .token 2>/dev/null || true)
if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  record_result "auth/login" "FAIL"
else
  record_result "auth/login" "PASS"
fi

# --- 3. Pipeline ---
if curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/pipeline/cards" >/dev/null; then
  record_result "pipeline/cards" "PASS"
else
  record_result "pipeline/cards" "FAIL"
fi

# --- 4. Documents ---
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

# --- 5. CRM ---
if curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/crm/contacts" >/dev/null; then
  record_result "crm/contacts" "PASS"
else
  record_result "crm/contacts" "FAIL"
fi

# --- 6. Communication ---
for ep in "communication/sms/threads" "communication/calls" "communication/email/threads"; do
  if curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/$ep" >/dev/null; then
    record_result "$ep" "PASS"
  else
    record_result "$ep" "FAIL"
  fi
done

# --- 7. Lender ---
if curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/lender-products" >/dev/null; then
  record_result "lender-products" "PASS"
else
  record_result "lender-products" "FAIL"
fi

# --- 8. OCR ---
if curl -sf -H "Authorization: Bearer $TOKEN" "$BASE_URL/ocr/insights" >/dev/null; then
  record_result "ocr/insights" "PASS"
else
  record_result "ocr/insights" "FAIL"
fi

# --- Summaries ---
TOTAL=$(wc -l < "$REPORT_FILE")
FAILS=$(grep -c FAIL "$REPORT_FILE" || true)
PASSES=$(grep -c PASS "$REPORT_FILE" || true)
SUCCESS_RATE=$(( 100 * PASSES / TOTAL ))

if [ "$FAILS" -eq 0 ]; then
  STATUS="FULLY_OPERATIONAL"
elif [ "$PASSES" -gt 0 ]; then
  STATUS="MOSTLY_WORKING"
else
  STATUS="CRITICAL_ISSUES"
fi

# Dedup list
awk '{print $2": "$1}' "$REPORT_FILE" | sort | uniq -c | awk '{print "Count=" $1, $2, $3}' > "$SUMMARY_FILE"

# Build JSON export
jq -n \
  --arg ts "$(date -Iseconds)" \
  --arg status "$STATUS" \
  --arg total "$TOTAL" \
  --arg passes "$PASSES" \
  --arg fails "$FAILS" \
  --arg success "$SUCCESS_RATE" \
  --argfile raw <(jq -R -s -c 'split("\n")[:-1] | map(split(": ")) | map({"status": .[0], "endpoint": .[1]})' "$REPORT_FILE") \
  --argfile fails_only <(grep FAIL "$REPORT_FILE" | jq -R -s -c 'split("\n")[:-1] | map(split(": ")) | map(.[1])') \
  '{
    timestamp: $ts,
    system_status: $status,
    summary: {
      total: ($total|tonumber),
      pass: ($passes|tonumber),
      fail: ($fails|tonumber),
      success_rate_percent: ($success|tonumber)
    },
    endpoints: $raw,
    failed_endpoints: $fails_only
  }' > "$JSON_FILE"

echo "=== RESULTS COMPLETE ==="
cat "$REPORT_FILE"
echo "---"
cat "$SUMMARY_FILE"
echo "---"
cat "$JSON_FILE" | jq .