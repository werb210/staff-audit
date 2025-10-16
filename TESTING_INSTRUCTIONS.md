# DOCUMENT TYPE ENUM VALIDATION TESTING INSTRUCTIONS

## Overview
This document provides step-by-step instructions for testing the comprehensive document type enum version control system.

## System Components to Test

### 1. Canonical Document Types Source
**File**: `shared/documentTypes.ts`
**What to verify**: All 30 document types loaded with version tracking

```bash
# Check the canonical source is loaded
grep -A5 "CANONICAL_DOCUMENT_TYPES" shared/documentTypes.ts
```

### 2. API Validation Endpoints
**Base URL**: `/api/document-validation/*`
**What to verify**: All validation endpoints respond correctly

#### Test Valid Document Type
```bash
curl -X POST http://localhost:5000/api/document-validation/validate \
  -H "Content-Type: application/json" \
  -d '{"documentType": "bank_statements", "fileName": "test.pdf"}'
```
**Expected**: 200 status with success response

#### Test Invalid Document Type
```bash
curl -X POST http://localhost:5000/api/document-validation/validate \
  -H "Content-Type: application/json" \
  -d '{"documentType": "invalid_type", "fileName": "test.pdf"}'
```
**Expected**: 400 status with error response and supported types list

#### Get All Document Types
```bash
curl -X GET http://localhost:5000/api/document-validation/types
```
**Expected**: JSON with all 30 canonical document types

#### Health Check
```bash
curl -X GET http://localhost:5000/api/document-validation/health-check
```
**Expected**: Service status with enum version info

### 3. Frontend UI Component
**File**: `client/src/components/DocumentTypeSelector.tsx`
**What to verify**: Component loads without hardcoded dropdowns

```typescript
// Import and use the component
import { DocumentTypeSelector } from '@/components/DocumentTypeSelector';

// Should show all 30 document types from canonical source
<DocumentTypeSelector
  value={documentType}
  onValueChange={setDocumentType}
  placeholder="Select document type"
/>
```

### 4. Automated Testing System
**File**: `scripts/final-document-upload-test.mjs`
**What to verify**: All 30 document types pass validation

```bash
# Run the automated test
node scripts/final-document-upload-test.mjs
```
**Expected**: 100% success rate for all 30 document types

## Test Scenarios

### Scenario 1: Happy Path - All Valid Types
**Goal**: Verify all 30 canonical document types pass validation
**Steps**:
1. Run automated test: `node scripts/final-document-upload-test.mjs`
2. Check console output for 100% success rate
3. Verify no alerts are generated

**Success Criteria**:
- All 30 types return 200 status
- No failures in test results
- Success rate = 100%

### Scenario 2: Invalid Type Rejection
**Goal**: Verify system rejects invalid document types
**Steps**:
1. Submit non-canonical document type via API
2. Check for 400 status response
3. Verify error includes supported types list

**Success Criteria**:
- 400 status returned
- Error message lists canonical types
- Enum version included in response

### Scenario 3: UI Component Integration
**Goal**: Verify frontend component uses canonical source
**Steps**:
1. Load page with DocumentTypeSelector
2. Open dropdown menu
3. Count available options
4. Verify labels match DOCUMENT_TYPE_LABELS

**Success Criteria**:
- Exactly 30 options available
- All labels human-readable
- No hardcoded options visible

### Scenario 4: Version Tracking
**Goal**: Verify enum version is tracked consistently
**Steps**:
1. Check shared/documentTypes.ts ENUM_VERSION
2. Call /api/document-validation/health-check
3. Compare version numbers

**Success Criteria**:
- Version numbers match across all endpoints
- Timestamp shows recent update
- Total count = 30

## Alert Testing

### Simulate Validation Failure
To test the alert system, temporarily break validation:

1. **Modify validation endpoint** to return 500 for specific type
2. **Run automated test** to trigger failures
3. **Check alert generation** in logs directory
4. **Restore normal operation** after testing

### Expected Alert Structure
```json
{
  "alert": "DOCUMENT_ENUM_VALIDATION_FAILURE",
  "severity": "HIGH",
  "failures": 1,
  "totalTypes": 30,
  "failureRate": "3.3%",
  "failedTypes": ["test_type"],
  "enumVersion": "1.0.0",
  "environment": "development"
}
```

## Production Testing

### Pre-Deployment Checklist
- [ ] All 30 document types validate successfully
- [ ] API endpoints return correct status codes
- [ ] UI components load without errors
- [ ] Automated test achieves 100% success rate
- [ ] Alert system generates proper notifications
- [ ] Version tracking shows consistent numbers

### Post-Deployment Verification
1. **Run production test**: Update BASE_URL to production domain
2. **Monitor alerts**: Check for any validation failures
3. **Verify UI**: Test document type selection in production
4. **Database check**: Confirm enum values match database

## Troubleshooting

### Common Issues

#### Test Script ES Module Errors
**Problem**: `require is not defined in ES module scope`
**Solution**: Use `.mjs` extension and ES module imports

#### API Endpoint 404 Errors
**Problem**: Validation endpoints not found
**Solution**: Check server/index.ts for proper route mounting

#### UI Component Missing Types
**Problem**: Dropdown shows fewer than 30 options
**Solution**: Verify import from shared/documentTypes.ts

#### Database Enum Mismatch
**Problem**: Database has different enum values
**Solution**: Run canonical enum query to verify database state

### Debug Commands

```bash
# Check server logs
tail -f logs/server.log

# Verify route mounting
grep -n "document-validation" server/index.ts

# Check database enum values
psql -d $DATABASE_URL -c "SELECT unnest(enum_range(NULL::document_type));"

# Test specific endpoint
curl -v http://localhost:5000/api/document-validation/health-check
```

## Success Metrics

### Development Environment
- ✅ All 30 canonical document types loaded
- ✅ API validation endpoints operational
- ✅ UI components use canonical source
- ✅ Automated testing achieves 100% success
- ✅ Alert system properly configured

### Production Environment
- ✅ Same success metrics as development
- ✅ Cross-origin authentication working
- ✅ Performance meets requirements
- ✅ Monitoring and alerts active
- ✅ Documentation complete and accurate

This testing framework ensures the document type enum version control system operates reliably across all environments and use cases.