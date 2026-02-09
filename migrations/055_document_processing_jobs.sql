create table if not exists document_processing_jobs (
  id text primary key,
  document_id text not null references documents(id) on delete cascade,
  job_type text not null,
  status text not null,
  started_at timestamptz null,
  completed_at timestamptz null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, job_type)
);

alter table if exists document_processing_jobs
  drop constraint if exists document_processing_jobs_status_check;

alter table if exists document_processing_jobs
  add constraint document_processing_jobs_status_check
    check (status in ('pending', 'processing', 'completed', 'failed'));

alter table if exists document_processing_jobs
  drop constraint if exists document_processing_jobs_job_type_check;

alter table if exists document_processing_jobs
  add constraint document_processing_jobs_job_type_check
    check (job_type in ('ocr'));

create table if not exists banking_analysis_jobs (
  id text primary key,
  application_id text not null references applications(id) on delete cascade,
  status text not null,
  statement_months_detected integer null,
  started_at timestamptz null,
  completed_at timestamptz null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id)
);

alter table if exists banking_analysis_jobs
  drop constraint if exists banking_analysis_jobs_status_check;

alter table if exists banking_analysis_jobs
  add constraint banking_analysis_jobs_status_check
    check (status in ('pending', 'processing', 'completed', 'failed'));

alter table if exists applications
  add column if not exists ocr_completed_at timestamptz null,
  add column if not exists banking_completed_at timestamptz null;
