create table if not exists continuation_sessions (
  id uuid primary key default gen_random_uuid(),
  application_id text not null references applications(id) on delete cascade,
  token text not null unique,
  created_at timestamp default now(),
  expires_at timestamp not null
);

alter table if exists crm_leads
  add column if not exists application_id text references applications(id) on delete set null;

alter table if exists crm_leads
  add column if not exists tag text;
