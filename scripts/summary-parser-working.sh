#!/bin/bash
set -euo pipefail

echo "🔍 STAFF APP TEST SUMMARY PARSER"
echo "================================"

# Run the working test and capture output
TEST_OUTPUT=$(./scripts/test-staff-working.sh 2>&1)

# Count passes and fails
PASS_COUNT=$(echo "$TEST_OUTPUT" | grep -c "PASS:" 2>/dev/null || echo "0")
FAIL_COUNT=$(echo "$TEST_OUTPUT" | grep -c "FAIL:" 2>/dev/null || echo "0")
PASS_COUNT=${PASS_COUNT:-0}
FAIL_COUNT=${FAIL_COUNT:-0}
TOTAL=$((PASS_COUNT + FAIL_COUNT))

# Show the test output
echo "$TEST_OUTPUT"

echo ""
echo "📊 AUTOMATED SUMMARY"
echo "===================="
echo "✅ TOTAL PASSES: $PASS_COUNT"
echo "❌ TOTAL FAILS:  $FAIL_COUNT"
echo "📈 TOTAL TESTS:  $TOTAL"

if [ $TOTAL -gt 0 ]; then
  SUCCESS_RATE=$(( PASS_COUNT * 100 / TOTAL ))
  echo "🎯 SUCCESS RATE: $SUCCESS_RATE%"
else
  echo "🎯 SUCCESS RATE: 0% (no tests completed)"
fi

echo ""
if [ $FAIL_COUNT -eq 0 ] && [ $PASS_COUNT -gt 0 ]; then
  echo "🎉 ALL TESTS PASSED - SYSTEM FULLY OPERATIONAL!"
  exit 0
elif [ $PASS_COUNT -gt $FAIL_COUNT ]; then
  echo "⚠️  MOSTLY WORKING - Some systems need attention"
  exit 1
else
  echo "🚨 CRITICAL ISSUES - Multiple system failures detected"
  exit 2
fi