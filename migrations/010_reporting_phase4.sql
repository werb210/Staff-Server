create table if not exists reporting_pipeline_daily_snapshots (
  id text not null,

  snapshot_date date not null,
  pipeline_state text not null,
  application_count integer not null,
  created_at timestamp not null,
  unique (snapshot_date, pipeline_state),
  constraint reporting_pipeline_daily_snapshots_pk primary key (id)
);

create table if not exists reporting_application_volume_daily (
  id text not null,

  metric_date date not null,
  product_type text not null,
  applications_created integer not null,
  applications_submitted integer not null,
  applications_approved integer not null,
  applications_declined integer not null,
  applications_funded integer not null,
  created_at timestamp not null,
  unique (metric_date, product_type),
  constraint reporting_application_volume_daily_pk primary key (id)
);

create table if not exists reporting_document_metrics_daily (
  id text not null,

  metric_date date not null,
  document_type text not null,
  documents_uploaded integer not null,
  documents_reviewed integer not null,
  documents_approved integer not null,
  created_at timestamp not null,
  unique (metric_date, document_type),
  constraint reporting_document_metrics_daily_pk primary key (id)
);

create table if not exists reporting_staff_activity_daily (
  id text not null,

  metric_date date not null,
  staff_user_id uuid not null references users(id) on delete cascade,
  action text not null,
  activity_count integer not null,
  created_at timestamp not null,
  unique (metric_date, staff_user_id, action),
  constraint reporting_staff_activity_daily_pk primary key (id)
);

create table if not exists reporting_lender_funnel_daily (
  id text not null,

  metric_date date not null,
  lender_id text not null,
  submissions integer not null,
  approvals integer not null,
  funded integer not null,
  created_at timestamp not null,
  unique (metric_date, lender_id),
  constraint reporting_lender_funnel_daily_pk primary key (id)
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
