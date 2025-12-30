import { Pool } from "pg";

let pool: Pool | null = null;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`missing_env_${name}`);
  return v;
}

export function getDb(): Pool {
  if (!pool) {
    const connectionString = requireEnv("DATABASE_URL");
    pool = new Pool({
      connectionString,
      // Keep defaults; Azure Postgres generally needs SSL in prod, but DATABASE_URL
      // should already include sslmode=require if needed.
    });
  }
  return pool;
}

/**
 * Ensures DB connectivity and bootstraps the minimum schema this repo relies on.
 * This is intentionally idempotent (safe to run every start / every CI run).
 */
export async function assertDb(): Promise<Pool> {
  const db = getDb();

  // Verify connectivity
  const client = await db.connect();
  try {
    await client.query("select 1 as ok");
  } finally {
    client.release();
  }

  // Minimal bootstrap schema for auth + smoke tests
  await db.query(`
    create table if not exists users (
      id bigserial primary key,
      email text not null unique,
      password_hash text not null,
      role text not null default 'staff',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  return db;
}
