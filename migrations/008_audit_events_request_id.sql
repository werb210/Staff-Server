alter table audit_events
  add column if not exists request_id text;
