alter table auth_refresh_tokens
  add column if not exists token text null;
