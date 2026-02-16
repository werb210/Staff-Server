alter table if exists readiness_leads
  add column if not exists contact_name text,
  add column if not exists score integer,
  add column if not exists tier text,
  add column if not exists session_token text;

update readiness_leads
set contact_name = coalesce(contact_name, full_name)
where contact_name is null;

create unique index if not exists readiness_leads_session_token_uidx
  on readiness_leads (session_token)
  where session_token is not null;

create index if not exists readiness_leads_contact_name_idx
  on readiness_leads (contact_name);
