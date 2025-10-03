-- List all products with lender + core fields
SELECT l.name AS lender_name, c.name AS product_name, c.country, c.min_amount, c.max_amount, c.category, COALESCE(c.active, TRUE) AS active
  FROM crm_lender_products_canon c
  LEFT JOIN lenders l ON l.id = c.lender_id
 ORDER BY lender_name, product_name, country;

-- Count total
SELECT COUNT(*) AS total FROM crm_lender_products_canon;