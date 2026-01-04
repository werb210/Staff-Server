create table if not exists reporting_pipeline_daily_snapshots (
  id text primary key,
  snapshot_date date not null,
  pipeline_state text not null,
  application_count integer not null,
  created_at timestamp not null,
  unique (snapshot_date, pipeline_state)
);

create table if not exists reporting_application_volume_daily (
  id text primary key,
  metric_date date not null,
  product_type text not null,
  applications_created integer not null,
  applications_submitted integer not null,
  applications_approved integer not null,
  applications_declined integer not null,
  applications_funded integer not null,
  created_at timestamp not null,
  unique (metric_date, product_type)
);

create table if not exists reporting_document_metrics_daily (
  id text primary key,
  metric_date date not null,
  document_type text not null,
  documents_uploaded integer not null,
  documents_reviewed integer not null,
  documents_approved integer not null,
  created_at timestamp not null,
  unique (metric_date, document_type)
);

create table if not exists reporting_staff_activity_daily (
  id text primary key,
  metric_date date not null,
  staff_user_id text not null references users(id) on delete cascade,
  action text not null,
  activity_count integer not null,
  created_at timestamp not null,
  unique (metric_date, staff_user_id, action)
);

create table if not exists reporting_lender_funnel_daily (
  id text primary key,
  metric_date date not null,
  lender_id text not null,
  submissions integer not null,
  approvals integer not null,
  funded integer not null,
  created_at timestamp not null,
  unique (metric_date, lender_id)
);

create index if not exists reporting_pipeline_daily_snapshot_idx
  on reporting_pipeline_daily_snapshots (snapshot_date, pipeline_state);

create index if not exists reporting_application_volume_daily_idx
  on reporting_application_volume_daily (metric_date, product_type);

create index if not exists reporting_document_metrics_daily_idx
  on reporting_document_metrics_daily (metric_date, document_type);

create index if not exists reporting_staff_activity_daily_idx
  on reporting_staff_activity_daily (metric_date, staff_user_id, action);

create index if not exists reporting_lender_funnel_daily_idx
  on reporting_lender_funnel_daily (metric_date, lender_id);
