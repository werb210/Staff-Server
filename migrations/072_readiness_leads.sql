create table if not exists readiness_leads (
  id uuid not null,
  company_name text not null,
  full_name text not null,
  phone text not null,
  email text not null,
  industry text null,
  years_in_business integer null,
  monthly_revenue numeric null,
  annual_revenue numeric null,
  ar_outstanding numeric null,
  existing_debt boolean null,
  source text not null,
  status text not null default 'new',
  crm_contact_id uuid null,
  application_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint readiness_leads_pk primary key (id)
);

create index if not exists readiness_leads_email_idx on readiness_leads (email);
create index if not exists readiness_leads_phone_idx on readiness_leads (phone);
create index if not exists readiness_leads_status_idx on readiness_leads (status);
