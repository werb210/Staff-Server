create table if not exists readiness_sessions (
  id uuid not null,
  token text not null unique,
  email text not null,
  phone text,
  company_name text not null,
  full_name text not null,
  industry text,
  years_in_business integer,
  monthly_revenue numeric,
  annual_revenue numeric,
  ar_outstanding numeric,
  existing_debt boolean,
  crm_lead_id uuid,
  converted_application_id uuid,
  is_active boolean not null default true,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint readiness_sessions_pk primary key (id)
);

create unique index if not exists readiness_sessions_email_active_uniq
  on readiness_sessions (lower(email))
  where is_active = true;

create index if not exists readiness_sessions_token_idx on readiness_sessions (token);
create index if not exists readiness_sessions_expires_at_idx on readiness_sessions (expires_at);

create table if not exists readiness_application_mappings (
  id uuid not null default gen_random_uuid(),
  readiness_session_id uuid not null references readiness_sessions(id) on delete cascade,
  application_id uuid not null,
  created_at timestamptz not null default now(),
  unique (readiness_session_id),
  unique (application_id),
  constraint readiness_application_mappings_pk primary key (id)
);

create table if not exists crm_lead_activities (
  id uuid not null,
  lead_id uuid not null references crm_leads(id) on delete cascade,
  activity_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint crm_lead_activities_pk primary key (id)
);

create index if not exists crm_lead_activities_lead_id_idx on crm_lead_activities (lead_id, created_at desc);

alter table if exists chat_sessions
  add column if not exists staff_override boolean not null default false;
