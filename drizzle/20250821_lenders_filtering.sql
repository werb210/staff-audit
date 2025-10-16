-- 1) Speed up filtering on product list
CREATE INDEX IF NOT EXISTS idx_lp_country        ON lender_products (country_offered);
CREATE INDEX IF NOT EXISTS idx_lp_category       ON lender_products (product_category);
CREATE INDEX IF NOT EXISTS idx_lp_lendername     ON lender_products (lender_name);
CREATE INDEX IF NOT EXISTS idx_lp_lenderid_cat   ON lender_products (lender_id, product_category);
CREATE INDEX IF NOT EXISTS idx_lp_lenderid_cntry ON lender_products (lender_id, country_offered);

-- 2) Quick lookup of lender by id/name
CREATE INDEX IF NOT EXISTS idx_lenders_name ON lenders (name);

-- 3) Optional helper view for tidy values (trims stray spaces and nulls)
CREATE OR REPLACE VIEW v_lender_products_clean AS
SELECT
  lp.*,
  NULLIF(trim(lp.country_offered), '')     AS country_clean,
  NULLIF(trim(lp.product_category), '')    AS category_clean,
  NULLIF(trim(lp.lender_name), '')         AS lender_name_clean
FROM lender_products lp;