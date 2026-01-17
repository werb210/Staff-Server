import { isPgMem, pool } from "../db";

type PgError = { code?: string; message?: string };

export async function ensureOtpTableExists(): Promise<void> {
  try {
    if (process.env.NODE_ENV === "test" || isPgMem) {
      const exists = await pool.query(
        `select 1 from information_schema.tables where table_name = 'otp_verifications'`
      );
      if (exists.rowCount && exists.rowCount > 0) {
        return;
      }
    }
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if ((process.env.NODE_ENV === "test" || isPgMem) && message.includes("already exists")) {
      return;
    }
    throw err;
  }

  if (process.env.NODE_ENV === "test" || isPgMem) {
    return;
  }

  const constraintResult = await pool.query(
    `
      select 1
      from pg_constraint
      where conname = $1
    `,
    ["otp_verifications_status_check"],
  );

  if (constraintResult.rowCount === 0) {
    try {
      await pool.query(`
        alter table otp_verifications
        add constraint otp_verifications_status_check
        check (status in ('pending','approved','expired'));
      `);
    } catch (err) {
      const error = err as PgError;
      if (error.code !== "42P07" && !error.message?.includes("already exists")) {
        throw err;
      }
    }
  }
}
