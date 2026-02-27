create table if not exists communications (
  id uuid not null,
  type text,
  direction text,
  status text,
  duration integer,
  twilio_sid text,
  contact_id uuid null references contacts(id) on delete set null,
  user_id uuid null references users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint communications_pk primary key (id)
);

create table if not exists communications_messages (
  id uuid not null,
  type text,
  direction text,
  status text,
  duration integer,
  twilio_sid text,
  contact_id uuid null references contacts(id) on delete set null,
  user_id uuid null references users(id) on delete set null,
  body text,
  created_at timestamptz not null default now(),
  constraint communications_messages_pk primary key (id)
);

create index if not exists communications_created_at_idx
  on communications (created_at desc);

create index if not exists communications_contact_id_idx
  on communications (contact_id, created_at desc);

create index if not exists communications_messages_created_at_idx
  on communications_messages (created_at desc);

create index if not exists communications_messages_contact_id_idx
  on communications_messages (contact_id, created_at desc);
