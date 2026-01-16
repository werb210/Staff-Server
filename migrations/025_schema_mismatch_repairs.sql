alter table applications
  add column if not exists owner_user_id uuid;

alter table applications
  add column if not exists name text;

alter table idempotency_keys
  add column if not exists method text;

update idempotency_keys
set method = 'POST'
where method is null;

alter table idempotency_keys
  alter column method set default 'POST';

alter table idempotency_keys
  alter column method set not null;
