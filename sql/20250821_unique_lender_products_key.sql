BEGIN;

-- Normalize existing rows (just in case)
UPDATE lender_products
SET lender_name = TRIM(lender_name),
    product_name = TRIM(product_name),
    country_offered = TRIM(COALESCE(country_offered,''));

-- Add unique constraint for idempotent upserts (drop if exists first)
ALTER TABLE lender_products
  DROP CONSTRAINT IF EXISTS uq_lender_products_key;

ALTER TABLE lender_products
  ADD CONSTRAINT uq_lender_products_key
  UNIQUE (lender_name, product_name, country_offered);

COMMIT;