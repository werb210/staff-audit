-- Initialize database tables for Staff Application
CREATE TABLE IF NOT EXISTS staff_users(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) UNIQUE NOT NULL,
  phone varchar(32) UNIQUE NOT NULL,
  role varchar(32) NOT NULL,
  name varchar(255) NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_contacts(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(255) NOT NULL,
  email varchar(255),
  phone varchar(32),
  owner_id uuid REFERENCES staff_users(id),
  tags text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_applications(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES staff_contacts(id),
  business_name varchar(255),
  stage varchar(64) NOT NULL DEFAULT 'submitted',
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_documents(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES staff_applications(id) NOT NULL,
  category varchar(64) NOT NULL,
  name varchar(255) NOT NULL,
  s3_key text NOT NULL,
  content_type varchar(128) NOT NULL,
  size_bytes int NOT NULL,
  version int NOT NULL DEFAULT 1,
  status varchar(32) NOT NULL DEFAULT 'pending',
  reject_reason text,
  uploaded_by varchar(64) NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_lender_products(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lender varchar(255) NOT NULL,
  name varchar(255) NOT NULL,
  country varchar(32) NOT NULL,
  category varchar(64) NOT NULL,
  min_amount numeric(14,2) NOT NULL,
  max_amount numeric(14,2) NOT NULL,
  min_rate numeric(5,2) NOT NULL,
  max_rate numeric(5,2) NOT NULL,
  min_term int NOT NULL,
  max_term int NOT NULL,
  notes text
);

CREATE TABLE IF NOT EXISTS staff_comms(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES staff_contacts(id),
  kind varchar(32) NOT NULL,
  direction varchar(16),
  subject text,
  body text,
  meta text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staff_audits(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type varchar(64) NOT NULL,
  entity varchar(64) NOT NULL,
  entity_id uuid NOT NULL,
  user_id uuid,
  data text,
  created_at timestamp DEFAULT now()
);

-- Seed admin user
INSERT INTO staff_users (email, phone, role, name) 
VALUES ('todd.w@boreal.financial', '+15878881837', 'admin', 'Todd Werboweski')
ON CONFLICT (email) DO NOTHING;

-- Add some sample data
INSERT INTO staff_contacts (full_name, email, phone, tags) 
VALUES 
  ('John Smith', 'john.smith@example.com', '+16045551234', 'prospect,restaurant'),
  ('Sarah Johnson', 'sarah.johnson@example.com', '+17785559876', 'client,manufacturing')
ON CONFLICT DO NOTHING;

INSERT INTO staff_lender_products (lender, name, country, category, min_amount, max_amount, min_rate, max_rate, min_term, max_term, notes)
VALUES 
  ('Capital Direct', 'Small Business Term Loan', 'Canada', 'Term Loan', 10000, 500000, 8.5, 15.5, 12, 60, 'Fast approval for established businesses'),
  ('Quantum Finance', 'Equipment Financing', 'Canada', 'Equipment Financing', 25000, 2000000, 6.5, 12.0, 24, 84, 'Competitive rates for equipment purchases'),
  ('Alliance Credit', 'Business Line of Credit', 'Canada', 'Business Line of Credit', 5000, 250000, 9.0, 18.0, 12, 36, 'Flexible access to working capital')
ON CONFLICT DO NOTHING;