create table if not exists lenders (
  id text not null,
  primary key (id),
  name text not null,
  phone text not null,
  website text null,
  description text null,
  active boolean not null default true,
  status text not null default 'ACTIVE',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists lender_products (
  id text not null,
  primary key (id),
  lender_id text not null references lenders(id) on delete cascade,
  name text not null,
  description text null,
  active boolean not null default true,
  status text not null default 'ACTIVE',
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
