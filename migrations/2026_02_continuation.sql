create table if not exists continuation_sessions (
  id uuid not null default gen_random_uuid(),
  application_id text not null references applications(id) on delete cascade,
  token text not null unique,
  created_at timestamp default now(),
  expires_at timestamp not null,
  constraint continuation_sessions_pk primary key (id)
);

alter table if exists crm_leads
  add column if not exists application_id text references applications(id) on delete set null;

alter table if exists crm_leads
  add column if not exists tag text;
