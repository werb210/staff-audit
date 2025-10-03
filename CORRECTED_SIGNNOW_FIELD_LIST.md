# Corrected SignNow Field Names from Screenshot Analysis

## Field Names Visible in Screenshot

Looking at the attached screenshot, I can identify these field names in the SignNow template:

### Company Section:
- `legal_business_name`
- `dba_name` 
- `business_entity_type`
- `time_in_business`
- `number_of_employees`
- `business_street_address`
- `business_city`
- `business_state`
- `business_zip`
- `business_website`
- `business_phone`
- `contact_email`
- `contact_mobile`
- `industry`
- `annual_revenue`

### Principal/Personal Information Section:
- `contact_first_name`
- `contact_last_name`
- `date_of_birth`
- `contact_ssn`
- `applicant_street_address`
- `applicant_city`
- `applicant_state`  
- `applicant_zip`

### Requested Amount Section:
- `requested_amount`
- `equipment_value`
- `use_of_funds`

### Footer Section:
- `contact_first_name` (repeated)
- `contact_last_name` (repeated)
- `application_date`

## Issue Analysis

The field names I'm sending appear to match what's in the screenshot, but SignNow says "Field legal_business_name not found among text fields."

This suggests one of two possibilities:
1. The field names in the template are slightly different than what appears visually
2. The fields exist but are configured as a different field type (not "text fields")

## Next Steps

1. Try alternative field names based on common SignNow patterns
2. Check if fields are configured as different types (dropdown, checkbox, etc.)
3. Use the exact field names that are working from successful field population