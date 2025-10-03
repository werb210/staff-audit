-- Microsoft 365 token storage
create table if not exists o365_tokens (
  user_id      text primary key,
  access_token text        not null,
  refresh_token text       not null,
  expires_at   bigint      not null, -- unix seconds
  scope        text,
  tenant       text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Upsert helper (Postgres 12+): nothing else needed; service uses ON CONFLICT (user_id)
