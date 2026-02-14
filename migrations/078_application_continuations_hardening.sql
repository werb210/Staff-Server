alter table if exists application_continuations
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists company_name text,
  add column if not exists full_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists industry text,
  add column if not exists years_in_business integer,
  add column if not exists monthly_revenue numeric,
  add column if not exists annual_revenue numeric,
  add column if not exists ar_outstanding numeric,
  add column if not exists existing_debt boolean,
  add column if not exists crm_lead_id uuid,
  add column if not exists converted_application_id uuid,
  add column if not exists converted_at timestamptz;

create index if not exists application_continuations_email_idx
  on application_continuations (lower(email));

create index if not exists application_continuations_phone_idx
  on application_continuations (regexp_replace(coalesce(phone, ''), '\\D', '', 'g'));
