alter table if exists application_continuations
  alter column prefill_json set default '{}'::jsonb;

update application_continuations
set prefill_json = '{}'::jsonb
where prefill_json is null;
