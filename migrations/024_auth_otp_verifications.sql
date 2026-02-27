create table if not exists otp_verifications (
  id uuid not null,
  user_id uuid not null references users(id) on delete cascade,
  phone text not null,
  verification_sid text null,
  status text not null,
  verified_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint otp_verifications_pk primary key (id)
);

alter table if exists otp_verifications
  add constraint otp_verifications_status_check
  check (status in ('pending', 'approved', 'expired'));

create index if not exists otp_verifications_user_status_idx
  on otp_verifications (user_id, status);

create index if not exists otp_verifications_phone_idx
  on otp_verifications (phone);
