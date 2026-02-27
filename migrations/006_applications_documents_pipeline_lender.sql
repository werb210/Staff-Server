create table if not exists applications (
  id text not null,
  primary key (id),
  owner_user_id uuid not null references users(id) on delete cascade,
  name text not null,
  metadata jsonb null,
  pipeline_state text not null,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);

create table if not exists documents (
  id text not null,
  primary key (id),
  application_id text not null references applications(id) on delete cascade,
  owner_user_id uuid not null references users(id) on delete cascade,
  title text not null,
  created_at timestamp not null default now()
);

create table if not exists document_versions (
  id text not null,
  primary key (id),
  document_id text not null references documents(id) on delete cascade,
  version integer not null,
  metadata jsonb not null,
  content text not null,
  created_at timestamp not null,
  unique (document_id, version)
);

create table if not exists lender_submissions (
  id text not null,
  primary key (id),
  application_id text not null references applications(id) on delete cascade,
  status text not null,
  idempotency_key text not null unique,
  created_at timestamp not null default now(),
  updated_at timestamp not null default now()
);
