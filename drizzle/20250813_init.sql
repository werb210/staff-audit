create table if not exists users(
  id uuid primary key default gen_random_uuid(),
  email varchar(255) unique not null,
  phone varchar(32) unique not null,
  role varchar(32) not null,
  name varchar(255) not null,
  created_at timestamp default now()
);

create table if not exists contacts(
  id uuid primary key default gen_random_uuid(),
  full_name varchar(255) not null,
  email varchar(255),
  phone varchar(32),
  owner_id uuid references users(id),
  tags text,
  created_at timestamp default now()
);

create table if not exists applications(
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id),
  business_name varchar(255),
  stage varchar(64) not null default 'submitted',
  created_at timestamp default now()
);

create table if not exists documents(
  id uuid primary key default gen_random_uuid(),
  application_id uuid references applications(id) not null,
  category varchar(64) not null,
  name varchar(255) not null,
  s3_key text not null,
  content_type varchar(128) not null,
  size_bytes int not null,
  version int not null default 1,
  status varchar(32) not null default 'pending',
  reject_reason text,
  uploaded_by varchar(64) not null,
  created_at timestamp default now()
);

create table if not exists lender_products(
  id uuid primary key default gen_random_uuid(),
  lender varchar(255) not null,
  name varchar(255) not null,
  country varchar(32) not null,
  category varchar(64) not null,
  min_amount numeric(14,2) not null,
  max_amount numeric(14,2) not null,
  min_rate numeric(5,2) not null,
  max_rate numeric(5,2) not null,
  min_term int not null,
  max_term int not null,
  notes text
);

create table if not exists comms(
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id),
  kind varchar(32) not null,
  direction varchar(16),
  subject text,
  body text,
  meta text,
  created_at timestamp default now()
);

create table if not exists audits(
  id uuid primary key default gen_random_uuid(),
  type varchar(64) not null,
  entity varchar(64) not null,
  entity_id uuid not null,
  user_id uuid,
  data text,
  created_at timestamp default now()
);