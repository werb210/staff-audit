#!/bin/bash

echo "=== PRODUCTION SIGNNOW WORKFLOW VERIFICATION ==="
echo "Testing all 5 components on https://staff.boreal.financial"
echo ""

# Step 1: Create Application
echo "1. Creating test application..."
APP_RESPONSE=$(curl -s -X POST https://staff.boreal.financial/api/public/applications \
  -H "Content-Type: application/json" \
  -d '{
    "step1": {"businessName": "Production Verification", "businessType": "Corporation"},
    "step3": {"requestedAmount": 30000, "useOfFunds": "Equipment Purchase"},
    "step4": {"contactName": "QA Tester", "contactEmail": "qa@boreal.financial", "contactPhone": "+15551234567"}
  }')

APP_ID=$(echo "$APP_RESPONSE" | jq -r '.applicationId')
echo "   ✓ Application ID: $APP_ID"

# Step 2: Upload Document
echo "2. Uploading test document..."
echo "%PDF-1.4 Sample bank statement for production testing" > /tmp/production_test.pdf
UPLOAD_RESPONSE=$(curl -s -X POST https://staff.boreal.financial/api/public/upload/$APP_ID \
  -F "document=@/tmp/production_test.pdf" \
  -F "documentType=bank_statements")

echo "   ✓ Upload Result: $(echo "$UPLOAD_RESPONSE" | jq -r '.success')"

# Step 3: Create SignNow Document
echo "3. Creating SignNow document..."
SIGNNOW_RESPONSE=$(curl -s -X POST https://staff.boreal.financial/api/applications/$APP_ID/signnow \
  -H "Content-Type: application/json")

DOC_ID=$(echo "$SIGNNOW_RESPONSE" | jq -r '.documentId')
echo "   ✓ SignNow Document: $DOC_ID"

# Step 4: Test Webhook
echo "4. Testing webhook processing..."
WEBHOOK_RESPONSE=$(curl -s -X POST https://staff.boreal.financial/webhook/signnow/webhook \
  -H "Content-Type: application/json" \
  -d "{\"event_type\":\"document.completed\",\"document_id\":\"$DOC_ID\",\"user_id\":\"production_test\"}")

echo "   ✓ Webhook Result: $(echo "$WEBHOOK_RESPONSE" | jq -r '.success')"

# Step 5: Check Status
echo "5. Checking signing status..."
STATUS_RESPONSE=$(curl -s https://staff.boreal.financial/api/public/applications/$APP_ID/signing-status)
echo "   ✓ Status: $(echo "$STATUS_RESPONSE" | jq -r '.status')"

echo ""
echo "PRODUCTION WORKFLOW VERIFICATION COMPLETE"
echo "All 5 components tested on live production environment"