create table if not exists users (
  id uuid not null,
  email text not null unique,
  password_hash text not null,
  role text not null,
  active boolean not null,
  password_changed_at timestamptz null,
  failed_login_attempts integer not null default 0,
  locked_until timestamptz null,
  token_version integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_pk primary key (id)
);

create table if not exists auth_refresh_tokens (
  id uuid not null,
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (user_id),
  constraint auth_refresh_tokens_pk primary key (id)
);

create table if not exists password_resets (
  id uuid not null,
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz null,
  constraint password_resets_pk primary key (id)
);

create table if not exists audit_logs (
  id text not null,

  actor_user_id uuid null references users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text null,
  ip text null,
  success boolean not null,
  created_at timestamptz not null,
  constraint audit_logs_pk primary key (id)
);

create table if not exists audit_events (
  id text not null,

  user_id uuid null references users(id) on delete set null,
  action text not null,
  ip text null,
  user_agent text null,
  success boolean not null,
  created_at timestamptz not null,
  constraint audit_events_pk primary key (id)
);
