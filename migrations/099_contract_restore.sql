create table if not exists idempotency_keys (
  key text not null,
  response jsonb not null,
  created_at timestamp not null default now(),
  constraint idempotency_keys_contract_pk primary key (key)
);

create table if not exists audit_events (
  id uuid not null,
  actor_user_id uuid null,
  event_type text not null,
  event_action text not null,
  created_at timestamp not null default now(),
  constraint audit_events_contract_pk primary key (id)
);

create table if not exists lender_product_requirements (
  id uuid not null,
  lender_product_id uuid not null,
  document_type text not null,
  required boolean not null default true,
  constraint lender_product_requirements_contract_pk primary key (id)
);

alter table if exists lender_product_requirements
  add column if not exists document_type text;
