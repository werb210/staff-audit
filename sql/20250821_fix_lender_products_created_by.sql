BEGIN;

-- 1) Add created_by column as UUID (matching users.id type)
ALTER TABLE lender_products
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT '00000000-0000-0000-0000-000000000001';

-- 2) Add country_offered column for schema compatibility  
ALTER TABLE lender_products
  ADD COLUMN IF NOT EXISTS country_offered text DEFAULT '';

-- 3) Ensure a 'system' user exists (uuid id) - using actual user table schema
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001', 'system@internal', '$2b$10$hashedpassword', 'System', 'Bot', 'admin',
  true, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 4) Add FK constraint after column exists
ALTER TABLE lender_products
  ADD CONSTRAINT lender_products_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

COMMIT;