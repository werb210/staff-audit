# Phase B - Pipeline & Applications Database Status

## ✅ Applications Table Schema Confirmed

### Key Fields:
- **stage**: USER-DEFINED enum (new, in_review, requires_docs, off_to_lender, approved, denied)
- **status**: USER-DEFINED enum (submitted, processing, etc.)
- **business_type**: VARCHAR
- **tenant_id**: UUID (for silo separation)
- **banking_analysis**: JSONB
- **document_approvals**: JSONB
- **form_data**: JSONB

### Current Data:
- **1 Application Found**: 
  - ID: 00000000-0000-0000-0000-000000000001
  - Stage: "Off to Lender" 
  - Status: "submitted"
  - Created: 2025-08-01

## Pipeline Stage Flow (V2):
```
1️⃣ New → 2️⃣ In Review → 3️⃣ Requires Docs → 4️⃣ Off to Lender → 5️⃣ Approved → 6️⃣ Denied
```

## Stage Validation Rules (from code):
- **new** → [in_review]
- **in_review** → [requires_docs, off_to_lender, denied] 
- **requires_docs** → [in_review, off_to_lender, denied]
- **off_to_lender** → [approved, denied]
- **approved** → [denied] (can revert)
- **denied** → [] (terminal)

## Next Testing:
- ✅ Database schema confirmed
- 🔄 Test application creation
- 🔄 Test stage transitions with drag & drop
- 🔄 Test stage transition SMS triggers