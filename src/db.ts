import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("missing_env_DATABASE_URL");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function assertDb(): Promise<void> {
  await pool.query(`create extension if not exists pgcrypto`);

  await pool.query(`
    create table if not exists users (
      id uuid primary key default gen_random_uuid(),
      email text unique not null,
      password_hash text not null,
      created_at timestamptz default now()
    )
  `);
}
