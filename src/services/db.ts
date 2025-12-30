import { Pool } from "pg";

let pool: Pool | null = null;

function shouldUseSsl() {
  if (process.env.PGSSLMODE === "disable") {
    return false;
  }

  return (
    process.env.PGSSLMODE === "require" ||
    process.env.PGSSL === "true" ||
    process.env.DATABASE_SSL === "true" ||
    process.env.NODE_ENV === "production"
  );
}

export async function initDb(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to start the server");
  }

  pool = new Pool({
    connectionString,
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
  });

  try {
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
  } catch (error) {
    pool = null;
    throw error;
  }
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error("Database has not been initialized");
  }

  return pool;
}

export async function checkDbConnection(): Promise<void> {
  const activePool = getPool();
  await activePool.query("SELECT 1");
}
