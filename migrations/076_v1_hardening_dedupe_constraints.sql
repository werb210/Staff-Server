alter table if exists readiness_sessions
  add column if not exists status text not null default 'open';

update readiness_sessions
set status = case
  when converted_application_id is not null then 'converted'
  when is_active = false then 'closed'
  else 'open'
end;

create unique index if not exists crm_leads_email_unique_norm_idx
  on crm_leads (lower(email))
  where email is not null and email <> '';

create unique index if not exists crm_leads_phone_unique_norm_idx
  on crm_leads (regexp_replace(phone, '\\D', '', 'g'))
  where phone is not null and regexp_replace(phone, '\\D', '', 'g') <> '';

create index if not exists readiness_sessions_phone_idx
  on readiness_sessions (regexp_replace(coalesce(phone, ''), '\\D', '', 'g'));

create index if not exists readiness_sessions_id_idx
  on readiness_sessions (id);
