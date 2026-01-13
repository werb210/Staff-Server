do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'auth_refresh_tokens'
      and column_name = 'token'
  ) then
    execute 'alter table auth_refresh_tokens alter column token drop not null';
  end if;
end $$;
