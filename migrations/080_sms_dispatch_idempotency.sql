create table if not exists sms_dispatches (
  id uuid primary key,
  dispatch_key text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists sms_dispatches_created_at_idx
  on sms_dispatches (created_at desc);
