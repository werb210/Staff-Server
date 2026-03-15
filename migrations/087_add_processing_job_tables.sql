create table if not exists document_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  application_id text not null,
  status text not null default 'pending',
  retry_count integer not null default 0,
  last_retry_at timestamp,
  max_retries integer not null default 3,
  updated_at timestamp not null default now(),
  error_message text,
  created_at timestamp not null default now()
);

alter table document_processing_jobs
  alter column application_id type text using application_id::text,
  alter column retry_count set default 0,
  alter column max_retries set default 3,
  alter column status set default 'pending',
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table document_processing_jobs
  add column if not exists retry_count integer not null default 0,
  add column if not exists last_retry_at timestamp,
  add column if not exists max_retries integer not null default 3,
  add column if not exists updated_at timestamp not null default now(),
  add column if not exists error_message text,
  add column if not exists created_at timestamp not null default now();

update document_processing_jobs
set retry_count = coalesce(retry_count, 0),
    max_retries = coalesce(max_retries, 3),
    status = coalesce(status, 'pending'),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

alter table document_processing_jobs
  alter column retry_count set not null,
  alter column max_retries set not null,
  alter column status set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_document_processing_application'
  ) then
    alter table document_processing_jobs
      add constraint fk_document_processing_application
      foreign key (application_id)
      references applications(id)
      on delete cascade;
  end if;
end
$$;

create table if not exists banking_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  application_id text not null,
  status text not null default 'pending',
  retry_count integer not null default 0,
  last_retry_at timestamp,
  max_retries integer not null default 3,
  updated_at timestamp not null default now(),
  error_message text,
  created_at timestamp not null default now()
);

alter table banking_analysis_jobs
  alter column application_id type text using application_id::text,
  alter column retry_count set default 0,
  alter column max_retries set default 3,
  alter column status set default 'pending',
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table banking_analysis_jobs
  add column if not exists retry_count integer not null default 0,
  add column if not exists last_retry_at timestamp,
  add column if not exists max_retries integer not null default 3,
  add column if not exists updated_at timestamp not null default now(),
  add column if not exists error_message text,
  add column if not exists created_at timestamp not null default now();

update banking_analysis_jobs
set retry_count = coalesce(retry_count, 0),
    max_retries = coalesce(max_retries, 3),
    status = coalesce(status, 'pending'),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

alter table banking_analysis_jobs
  alter column retry_count set not null,
  alter column max_retries set not null,
  alter column status set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_banking_analysis_application'
  ) then
    alter table banking_analysis_jobs
      add constraint fk_banking_analysis_application
      foreign key (application_id)
      references applications(id)
      on delete cascade;
  end if;
end
$$;

create table if not exists credit_summary_jobs (
  id uuid primary key default gen_random_uuid(),
  application_id text not null,
  status text not null default 'pending',
  retry_count integer not null default 0,
  last_retry_at timestamp,
  max_retries integer not null default 3,
  updated_at timestamp not null default now(),
  error_message text,
  created_at timestamp not null default now()
);

alter table credit_summary_jobs
  alter column application_id type text using application_id::text,
  alter column retry_count set default 0,
  alter column max_retries set default 3,
  alter column status set default 'pending',
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table credit_summary_jobs
  add column if not exists retry_count integer not null default 0,
  add column if not exists last_retry_at timestamp,
  add column if not exists max_retries integer not null default 3,
  add column if not exists updated_at timestamp not null default now(),
  add column if not exists error_message text,
  add column if not exists created_at timestamp not null default now();

update credit_summary_jobs
set retry_count = coalesce(retry_count, 0),
    max_retries = coalesce(max_retries, 3),
    status = coalesce(status, 'pending'),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

alter table credit_summary_jobs
  alter column retry_count set not null,
  alter column max_retries set not null,
  alter column status set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_credit_summary_application'
  ) then
    alter table credit_summary_jobs
      add constraint fk_credit_summary_application
      foreign key (application_id)
      references applications(id)
      on delete cascade;
  end if;
end
$$;
