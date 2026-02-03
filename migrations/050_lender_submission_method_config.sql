alter table if exists lenders
  add column if not exists submission_method text not null default 'email',
  add column if not exists submission_config jsonb null;

update lenders
set submission_method = lower(submission_method::text)
where submission_method is not null;

update lenders
set submission_method = 'email'
where submission_method is null;

alter table if exists lenders
  alter column submission_method type text using lower(submission_method::text),
  alter column submission_method set default 'email',
  alter column submission_method set not null;

alter table if exists lenders
  drop constraint if exists lenders_submission_method_check;

alter table if exists lenders
  add constraint lenders_submission_method_check
  check (submission_method in ('email', 'api', 'google_sheet'));

create table if not exists submission_events (
  id uuid primary key,
  application_id text not null references applications(id) on delete cascade,
  lender_id text not null references lenders(id) on delete cascade,
  method text not null,
  status text not null,
  internal_error text null,
  created_at timestamp not null default now()
);
