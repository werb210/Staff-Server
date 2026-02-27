create table if not exists pwa_subscriptions (
  id uuid not null,
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pwa_subscriptions_pk primary key (id)
);

create index if not exists idx_pwa_subscriptions_user_id
  on pwa_subscriptions (user_id);

create table if not exists pwa_notifications (
  id uuid not null,
  user_id uuid not null references users(id) on delete cascade,
  level text not null,
  title text not null,
  body text not null,
  delivered_at timestamptz not null,
  acknowledged_at timestamptz null,
  payload_hash text not null,
  constraint pwa_notifications_pk primary key (id)
);

create index if not exists idx_pwa_notifications_user_id
  on pwa_notifications (user_id);
