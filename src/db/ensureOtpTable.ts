import { pool } from "../db";

export async function ensureOtpTableExists(): Promise<void> {
  await pool.query(`
    create table if not exists otp_verifications (
      id uuid primary key,
      user_id uuid not null references users(id) on delete cascade,
      phone text not null,
      verification_sid text,
      status text not null,
      verified_at timestamptz,
      created_at timestamptz not null default now()
    );
  `);

  await pool.query(`
    do $$
    begin
      if not exists (
        select 1 from pg_constraint
        where conname = 'otp_verifications_status_check'
      ) then
        alter table otp_verifications
        add constraint otp_verifications_status_check
        check (status in ('pending','approved','expired'));
      end if;
    end$$;
  `);
}
