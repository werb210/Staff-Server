alter table auth_refresh_tokens
  drop constraint if exists auth_refresh_tokens_user_id_key;
