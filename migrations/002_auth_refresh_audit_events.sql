create table if not exists audit_events (
  id text primary key,
  user_id text null references users(id) on delete set null,
  action text not null,
  ip text null,
  user_agent text null,
  success boolean not null,
  created_at timestamp not null
);

alter table auth_refresh_tokens
  drop constraint if exists auth_refresh_tokens_user_id_key;

create index auth_refresh_tokens_user_id_idx
  on auth_refresh_tokens (user_id);
