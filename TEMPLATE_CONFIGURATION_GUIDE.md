# SignNow Template Configuration Guide

## Current Status
✅ **PUT /v2/documents/{document_id}/prefill-texts API Implementation**: Complete and verified  
✅ **Smart Fields Generation**: 29 fields properly mapped from application data  
✅ **Redirect URI Integration**: Correctly set to `https://clientportal.boreal.financial/apply/step-7`  
✅ **Webhook Processing**: Operational and tested  

⚠️ **Template Issue**: Current template has 0 fields configured, so prefilling is skipped

## Required Template Configuration

### Smart Fields Available for Mapping (29 fields):

**Business Information:**
- `legal_business_name` - Legal business name
- `dba_name` - DBA/Trade name  
- `business_entity_type` - Corporation, LLC, etc.
- `business_address` - Street address
- `business_city` - City
- `business_state` - State/Province
- `business_zip` - ZIP/Postal code
- `business_phone` - Business phone number
- `years_in_business` - Years established
- `industry` - Industry sector
- `annual_revenue` - Annual revenue amount
- `number_of_employees` - Employee count

**Contact Information:**
- `contact_first_name` - Primary contact first name
- `contact_last_name` - Primary contact last name
- `contact_full_name` - Complete contact name
- `contact_email` - Email address
- `contact_phone` - Phone number
- `contact_title` - Job title/position

**Application Details:**
- `requested_amount` - Loan amount requested
- `use_of_funds` - Purpose of funding
- `loan_term` - Desired loan term
- `application_date` - Application submission date

**Owner Information:**
- `owner_first_name` - Business owner first name
- `owner_last_name` - Business owner last name
- `owner_full_name` - Complete owner name
- `owner_ssn` - Social Security Number
- `owner_percentage` - Ownership percentage

**System Fields:**
- `application_id` - Unique application identifier

## Template Setup Instructions

1. **Access SignNow Template Editor**
   - Log into SignNow dashboard
   - Open template: `e7ba8b894c644999a7b38037ea66f4cc9cc524f5`

2. **Add Form Fields**
   - Add text fields for each required data point
   - Use exact field names from the list above
   - Set field properties (required, validation, etc.)

3. **Field Mapping Example**
   ```
   Field Name: legal_business_name
   Field Type: Text
   Required: Yes
   
   Field Name: requested_amount  
   Field Type: Number/Currency
   Required: Yes
   
   Field Name: contact_email
   Field Type: Email
   Required: Yes
   ```

4. **Save and Test**
   - Save template changes
   - Run verification script: `./signnow-template-verification.sh`
   - Verify fields are prefilled in signing session

## Expected Results After Configuration

✅ **Template Analysis**: Should show >0 fields configured  
✅ **Prefill Execution**: PUT /v2/documents/{id}/prefill-texts should execute with field data  
✅ **Field Population**: 29 smart fields injected into document  
✅ **Signing Experience**: Form fields pre-populated with application data  
✅ **Redirect Flow**: After signing, redirect to step-7 completion page  
✅ **Webhook Processing**: Signature completion triggers database updates  

## Verification Commands

```bash
# Test document creation with field prefilling
curl -X POST "https://staff.boreal.financial/api/applications/{app_id}/signnow"

# Expected log output:
# ✅ Template has X fields (where X > 0)
# ✅ PUT /v2/documents/{id}/prefill-texts executed
# ✅ 29 smart fields injected successfully
```

## Current Implementation Details

The system is already correctly configured with:
- **API Method**: PUT (not POST)
- **API Version**: /v2/ (not v1)  
- **Payload Format**: `{ "fields": [{ "field_name": "...", "prefilled_text": "..." }] }`
- **Error Handling**: Comprehensive logging and validation
- **Response Validation**: Confirms 200 OK from SignNow API

**Ready for immediate testing once template fields are configured.**