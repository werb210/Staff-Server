alter table if exists applications
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_term text,
  add column if not exists utm_content text,
  add column if not exists gclid text,
  add column if not exists msclkid text,
  add column if not exists ga_client_id text;

update applications
set
  utm_source = coalesce(utm_source, attribution ->> 'utm_source'),
  utm_medium = coalesce(utm_medium, attribution ->> 'utm_medium'),
  utm_campaign = coalesce(utm_campaign, attribution ->> 'utm_campaign'),
  utm_term = coalesce(utm_term, attribution ->> 'utm_term'),
  utm_content = coalesce(utm_content, attribution ->> 'utm_content'),
  gclid = coalesce(gclid, attribution ->> 'gclid'),
  msclkid = coalesce(msclkid, attribution ->> 'msclkid'),
  ga_client_id = coalesce(ga_client_id, attribution ->> 'ga_client_id', attribution ->> 'client_id')
where attribution is not null;
