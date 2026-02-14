create table if not exists continuation_sessions (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  full_name text,
  company_name text,
  prefill jsonb,
  application_id uuid,
  created_at timestamp default now()
);

alter table if exists continuation_sessions
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists full_name text,
  add column if not exists company_name text,
  add column if not exists prefill jsonb,
  add column if not exists created_at timestamp default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'continuation_sessions'
      and column_name = 'application_id'
      and data_type <> 'uuid'
  ) then
    alter table continuation_sessions
      alter column application_id type uuid
      using case
        when application_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then application_id::uuid
        else null
      end;
  end if;
end
$$;

alter table if exists continuation_sessions
  alter column application_id drop not null;

create table if not exists live_chat_queue (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'waiting',
  created_at timestamp default now()
);

create table if not exists ai_admin_rules (
  id uuid primary key default gen_random_uuid(),
  rule_type text,
  content text,
  created_at timestamp default now()
);


alter table if exists crm_leads
  add column if not exists metadata jsonb;
