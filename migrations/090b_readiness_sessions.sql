create table if not exists readiness_sessions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  phone text not null,
  full_name text not null,
  years_in_business integer null,
  annual_revenue numeric null,
  profitable boolean null,
  estimated_credit_score integer null,
  score text null,
  crm_lead_id uuid null,
  is_active boolean not null default true,
  converted_application_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists readiness_sessions_email_idx on readiness_sessions (email);
create index if not exists readiness_sessions_phone_idx on readiness_sessions (phone);
