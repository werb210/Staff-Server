import { Pool } from "pg";

let pool: Pool | null = null;

function shouldUseSsl() {
  return (
    process.env.PGSSLMODE === "require" ||
    process.env.PGSSL === "true" ||
    process.env.DATABASE_SSL === "true"
  );
}

export async function initDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("DATABASE_URL not set; using in-memory auth store.");
    return;
  }

  pool = new Pool({
    connectionString,
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
  });

  await pool.query("SELECT 1");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      refresh_token_hash TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

export function getPool(): Pool | null {
  return pool;
}
