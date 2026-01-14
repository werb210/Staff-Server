alter table users
  add column if not exists disabled boolean default false;

alter table users
  add column if not exists is_active boolean;
