alter table if exists applications
  add column if not exists attribution jsonb;
