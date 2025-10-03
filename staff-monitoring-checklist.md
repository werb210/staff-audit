# Staff Application Monitoring Checklist

## Daily Monitoring Tasks

### ✅ Review SignNow Service Logs
Check server logs for these critical indicators:

**Success Indicators:**
```
✅ PRODUCTION VERIFIED: 28 smart fields generated successfully
📋 PRODUCTION FIELDS SENT: legal_business_name, requested_amount, contact_email, business_city, business_state, ...
✅ PRODUCTION VERIFIED: All required fields populated
✅ PRODUCTION VERIFIED: prefill_text_tags included with 28 fields
✅ PRODUCTION VERIFIED: Authentic SignNow URL confirmed
🎯 PRODUCTION WORKFLOW VERIFICATION: Overall workflow PASS
```

**Warning Signs to Address:**
```
⚠️ PRODUCTION WARNING: Only [X] fields generated, expected 28
❌ PRODUCTION ERROR: Missing required fields: [field_names]
❌ PRODUCTION ERROR: Critical fields empty: [field_names]
❌ PRODUCTION ERROR: Invalid signing URL detected - not authentic SignNow
```

### ✅ Verify URL Authenticity
Confirm every `/api/public/signnow/initiate/:id` returns authentic app.signnow.com URLs:

**Valid URL Format:**
```
https://app.signnow.com/webapp/document/[DOCUMENT_ID]?access_token=[TOKEN]&route=fieldinvite
```

**Invalid URLs to Block:**
- Any URL containing `mock`, `fallback`, `temp`, `localhost`, or `example.com`
- URLs not using `app.signnow.com` domain
- URLs missing `access_token` or `route=fieldinvite` parameters

## Weekly Validation Tasks

### ✅ Run Automated Test Suite
Execute the comprehensive workflow validation:

```bash
./signnow-test-automation.sh
```

**Expected Results:**
- Application creation: SUCCESS
- SignNow initiation: SUCCESS  
- Status check: SUCCESS
- Smart fields URL: GENERATED
- Authentic SignNow URL detected: ✅

### ✅ Manual Production Test
Test against production environment:

```bash
BASE_URL=https://staff.boreal.financial ./signnow-test-automation.sh
```

## Monthly Review Tasks

### ✅ Field Count Consistency
Verify field count remains stable at 28+ fields:
- Review `prepareApplicationFields()` function
- Check for any missing field mappings
- Validate new business requirements haven't broken existing fields

### ✅ Required Fields Completeness
Confirm all critical fields are populated:
- `legal_business_name`
- `requested_amount`  
- `contact_email`
- `business_city`
- `business_state`

### ✅ Template Updates
Review SignNow template configuration:
- Confirm template ID: `e7ba8b894c644999a7b38037ea66f4cc9cc524f5`
- Verify template fields match generated smart fields
- Update field mappings if template changes

## Production Validation Workflow

### Complete End-to-End Test
Use this sequence to validate real production submissions:

```bash
# Step 1: Create application
curl -X POST https://staff.boreal.financial/api/public/applications \
  -H "Content-Type: application/json" \
  -d @real-app.json

# Step 2: Upload documents
curl -F "document=@bank.pdf" \
  -F "documentType=bank_statement" \
  https://staff.boreal.financial/api/public/applications/<id>/documents

# Step 3: Initiate SignNow
curl -X POST https://staff.boreal.financial/api/public/signnow/initiate/<id>

# Step 4: Sign document manually (use embedded URL or SignNow account)

# Step 5: Poll for signature status
curl https://staff.boreal.financial/api/public/signnow/status/<id>

# Step 6: Finalize application
curl -X POST https://staff.boreal.financial/api/public/applications/<id>/finalize
```

## Troubleshooting Guide

### If Field Count is Low
1. Check `prepareApplicationFields()` logs for generation process
2. Verify application data structure (step1/step3/step4)
3. Confirm no legacy format applications are being processed
4. Review field mapping functions for completeness

### If URLs Are Invalid
1. Check SignNow API credentials configuration
2. Verify template ID is authentic (not fallback)
3. Confirm SignNow service is properly authenticated
4. Check for any mock/fallback URL generation code

### If Fields Are Not Populated
1. Verify `prefill_text_tags` is included in API payload
2. Check smart fields generation process
3. Confirm template field names match generated fields
4. Validate application data completeness

## Emergency Contacts

If production verification fails or unexpected behavior occurs:
1. Check detailed logs for specific error messages
2. Review production verification audit trail
3. Ensure environment variables are properly configured
4. Run automated test suite to isolate issues

---

**Last Updated:** July 14, 2025
**Next Review:** August 14, 2025
**Status:** Production Ready