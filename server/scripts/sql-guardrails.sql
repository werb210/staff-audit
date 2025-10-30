-- DupCheck Pack - SQL Guardrails to Prevent Future Duplicates
-- Execute these commands carefully in production

-- 1. USERS Table Guardrails
-- Ensure email uniqueness within tenant (already exists but ensuring)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_unique 
ON users (LOWER(email));

-- Prevent multiple staff with same phone in same tenant
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_phone_unique 
ON users (tenant_id, phone) 
WHERE phone IS NOT NULL AND phone != '';

-- 2. CONTACTS Table Guardrails  
-- Prevent duplicate emails (case insensitive)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_email_unique 
ON contacts (LOWER(email)) 
WHERE email IS NOT NULL AND email != '';

-- Prevent multiple contacts with same phone + company
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_phone_company_unique 
ON contacts (phone, LOWER(company_file_name)) 
WHERE phone IS NOT NULL AND phone != '' AND company_file_name IS NOT NULL;

-- 3. APPLICATIONS Table Guardrails
-- Prevent duplicate business file_names within same tenant  
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_tenant_business_unique 
ON applications (tenant_id, LOWER(business_file_name)) 
WHERE business_file_name IS NOT NULL AND business_file_name != '';

-- Prevent duplicate business emails within same tenant
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_tenant_email_unique 
ON applications (tenant_id, LOWER(business_email)) 
WHERE business_email IS NOT NULL AND business_email != '';

-- Prevent SSN reuse (strict)
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_applications_ssn_unique 
ON applications (owner_ssn) 
WHERE owner_ssn IS NOT NULL AND owner_ssn != '';

-- 4. LENDER Table Guardrails (already in schema but ensuring)
-- Prevent duplicate lender file_names within tenant
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_lender_tenant_file_name_unique 
ON "Lender" (tenant, LOWER(file_name));

-- 5. LENDER PRODUCT Table Guardrails (already in schema but ensuring)  
-- Prevent duplicate product file_names per lender
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_lender_product_file_name_unique 
ON "LenderProduct" ("lenderId", LOWER(file_name));

-- 6. ADS CAMPAIGN Table Guardrails (already in schema but ensuring)
-- Prevent duplicate campaigns per platform per tenant
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_ads_campaign_unique 
ON "AdsCampaign" (tenant, platform, "campaignId");

-- 7. CRM CONTACTS Table Guardrails
-- Prevent duplicate emails in CRM
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_contacts_email_unique 
ON crm_contacts (LOWER(email)) 
WHERE email IS NOT NULL AND email != '';

-- Prevent duplicate contacts per company per tenant
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_contacts_company_unique 
ON crm_contacts (tenant_id, company_id, LOWER(first_file_name), LOWER(last_file_name))
WHERE company_id IS NOT NULL;

-- 8. Additional Data Quality Constraints

-- Ensure valid email formats (basic check)
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS chk_users_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE contacts ADD CONSTRAINT IF NOT EXISTS chk_contacts_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE applications ADD CONSTRAINT IF NOT EXISTS chk_applications_email_format 
CHECK (business_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Ensure phone numbers have reasonable format
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS chk_users_phone_format 
CHECK (phone ~ '^\+?[1-9]\d{7,14}$' OR phone ~ '^\(\d{3}\) \d{3}-\d{4}$');

ALTER TABLE contacts ADD CONSTRAINT IF NOT EXISTS chk_contacts_phone_format 
CHECK (phone ~ '^\+?[1-9]\d{7,14}$' OR phone ~ '^\(\d{3}\) \d{3}-\d{4}$');

-- Ensure tenant values are valid
ALTER TABLE "Lender" ADD CONSTRAINT IF NOT EXISTS chk_lender_tenant_valid 
CHECK (tenant IN ('bf', 'slf'));

ALTER TABLE "LenderProduct" ADD CONSTRAINT IF NOT EXISTS chk_lender_product_tenant_valid 
CHECK (tenant IN ('bf', 'slf'));

ALTER TABLE "AdsCampaign" ADD CONSTRAINT IF NOT EXISTS chk_ads_campaign_tenant_valid 
CHECK (tenant IN ('bf', 'slf'));

-- 9. Audit Trigger Setup (optional - for monitoring)
CREATE OR REPLACE FUNCTION log_duplicate_attempt() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO duplicate_attempt_log (table_file_name, attempted_data, conflict_reason, created_at)
  VALUES (TG_TABLE_NAME, row_to_json(NEW), 'unique_violation', NOW());
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create log table for tracking duplicate attempts
CREATE TABLE IF NOT EXISTS duplicate_attempt_log (
  id SERIAL PRIMARY KEY,
  table_file_name VARCHAR(100) NOT NULL,
  attempted_data JSONB,
  conflict_reason VARCHAR(200),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add triggers to log duplicate attempts (optional)
-- DROP TRIGGER IF EXISTS tr_users_duplicate_log ON users;
-- CREATE TRIGGER tr_users_duplicate_log 
--   AFTER INSERT ON users 
--   FOR EACH ROW 
--   WHEN (pg_trigger_depth() = 0)
--   EXECUTE FUNCTION log_duplicate_attempt();

-- 10. Data Cleanup Functions

-- Function to merge duplicate contacts
CREATE OR REPLACE FUNCTION merge_duplicate_contacts(keep_id UUID, merge_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  -- Update references to point to kept contact
  UPDATE call_participants SET contact_id = keep_id WHERE contact_id = merge_id;
  UPDATE call_records SET contact_id = keep_id WHERE contact_id = merge_id;
  UPDATE comms SET contact_id = keep_id WHERE contact_id = merge_id;
  UPDATE communication_logs SET contact_id = keep_id WHERE contact_id = merge_id;
  UPDATE issues SET contact_id = keep_id WHERE contact_id = merge_id;
  
  -- Delete the duplicate
  DELETE FROM contacts WHERE id = merge_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 11. Index Monitoring
-- Create view to monitor index usage
CREATE OR REPLACE VIEW duplicate_prevention_indexes AS
SELECT 
  schemafile_name,
  tablefile_name,
  indexfile_name,
  indexdef
FROM pg_indexes 
WHERE indexfile_name LIKE '%_unique' 
   OR indexfile_name LIKE 'idx_%duplicate%'
   OR indexfile_name LIKE 'idx_%tenant%'
ORDER BY tablefile_name, indexfile_name;

-- 12. Performance Considerations
-- Analyze tables after creating indexes
ANALYZE users;
ANALYZE contacts;
ANALYZE applications;
ANALYZE "Lender";
ANALYZE "LenderProduct";
ANALYZE "AdsCampaign";
ANALYZE crm_contacts;

-- Comments for documentation
COMMENT ON INDEX idx_users_email_unique IS 'DupCheck Pack: Prevents duplicate email addresses';
COMMENT ON INDEX idx_contacts_email_unique IS 'DupCheck Pack: Prevents duplicate contact emails';
COMMENT ON INDEX idx_applications_tenant_business_unique IS 'DupCheck Pack: Prevents duplicate business file_names per tenant';
COMMENT ON INDEX idx_lender_tenant_file_name_unique IS 'DupCheck Pack: Prevents duplicate lender file_names per tenant';
COMMENT ON INDEX idx_ads_campaign_unique IS 'DupCheck Pack: Prevents duplicate ad campaigns per platform';

-- Final check query
SELECT 'Guardrails installation complete' AS status;