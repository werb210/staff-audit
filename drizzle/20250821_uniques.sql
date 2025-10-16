ALTER TABLE lenders
  ADD CONSTRAINT IF NOT EXISTS lenders_name_uniq UNIQUE (name);

CREATE UNIQUE INDEX IF NOT EXISTS ux_lender_products_lender_cat
  ON lender_products (lender_id, product_category);