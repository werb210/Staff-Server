create table if not exists users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  role text not null,
  active boolean not null,
  password_changed_at timestamp not null,
  failed_login_attempts integer not null default 0,
  locked_until timestamp null,
  token_version integer not null default 0
);

create table if not exists auth_refresh_tokens (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamp not null,
  revoked_at timestamp null,
  created_at timestamp not null,
  unique (user_id)
);

create table if not exists password_resets (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamp not null,
  used_at timestamp null
);

create table if not exists audit_logs (
  id text primary key,
  actor_user_id text null references users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text null,
  ip text null,
  success boolean not null,
  created_at timestamp not null
);

create table if not exists audit_events (
  id text primary key,
  user_id text null references users(id) on delete set null,
  action text not null,
  ip text null,
  user_agent text null,
  success boolean not null,
  created_at timestamp not null
);
