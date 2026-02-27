create table if not exists lenders (
  id uuid not null,
  name text not null,
  country text not null,
  submission_method text null,
  email text null,
  phone text null,
  website text null,
  postal_code text null,
  created_at timestamptz not null default now(),
  constraint lenders_pk primary key (id)
);

alter table if exists lenders
  add column if not exists country text,
  add column if not exists submission_method text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists website text,
  add column if not exists postal_code text,
  add column if not exists created_at timestamptz;

update lenders
set country = 'US'
where country is null;

alter table if exists lenders
  alter column country set not null;

create table if not exists lender_products (
  id uuid not null,
  lender_id uuid not null references lenders(id) on delete cascade,
  name text not null,
  description text null,
  active boolean not null default true,
  required_documents jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lender_products_pk primary key (id)
);

alter table if exists lender_products
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists active boolean default true,
  add column if not exists required_documents jsonb default '[]'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();
