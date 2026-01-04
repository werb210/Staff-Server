drop table if exists audit_logs;

create table audit_events_new (
  id text primary key,
  actor_user_id text null references users(id) on delete set null,
  target_user_id text null references users(id) on delete set null,
  action text not null,
  ip text null,
  user_agent text null,
  success boolean not null,
  created_at timestamp not null
);

insert into audit_events_new (id, actor_user_id, target_user_id, action, ip, user_agent, success, created_at)
select
  id,
  user_id as actor_user_id,
  user_id as target_user_id,
  action,
  ip,
  user_agent,
  success,
  created_at
from audit_events;

drop table audit_events;

alter table audit_events_new rename to audit_events;
