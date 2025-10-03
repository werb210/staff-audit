CREATE TABLE IF NOT EXISTS lenders (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  normalized_name TEXT GENERATED ALWAYS AS (trim(lower(name))) STORED,
  status TEXT NOT NULL DEFAULT 'active',
  bf BOOLEAN NOT NULL DEFAULT TRUE,
  slf BOOLEAN NOT NULL DEFAULT TRUE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  website TEXT,
  country_support TEXT[] NOT NULL DEFAULT ARRAY['United States','Canada'],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO users (id, email, password_hash, phone, first_name, last_name, role, is_active, created_at)
VALUES (gen_random_uuid(),'system@local','','','System','User','staff',true, now())
ON CONFLICT (email) DO NOTHING;

ALTER TABLE lender_products
  ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;
ALTER TABLE lender_products
  ALTER COLUMN created_by SET DEFAULT 'system';

ALTER TABLE lender_products
  ADD COLUMN IF NOT EXISTS lender_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'lender_products_lender_id_fkey'
  ) THEN
    ALTER TABLE lender_products
      ADD CONSTRAINT lender_products_lender_id_fkey
      FOREIGN KEY (lender_id) REFERENCES lenders(id) ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='lender_products' AND column_name='interest_rate_minimum'
  ) THEN
    ALTER TABLE lender_products
      ALTER COLUMN interest_rate_minimum TYPE DOUBLE PRECISION,
      ALTER COLUMN interest_rate_maximum TYPE DOUBLE PRECISION;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='lender_products' AND column_name='country_offered'
  ) THEN
    ALTER TABLE lender_products ADD COLUMN country_offered TEXT;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_lender_prod_name_country
  ON lender_products (lender_id, product_name, country_offered);