import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("missing_env:DATABASE_URL");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function assertDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      create extension if not exists "pgcrypto";

      create table if not exists users (
        id uuid primary key default gen_random_uuid(),
        email text unique not null,
        password_hash text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);
  } finally {
    client.release();
  }
}
