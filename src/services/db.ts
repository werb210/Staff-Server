import { Pool } from "pg";

let pool: Pool | null = null;
let dbReady = false;

export async function initDb() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  await pool.query("select 1");
  dbReady = true;
}

export function getDb(): Pool {
  if (!pool) {
    throw new Error("DB not initialized");
  }
  return pool;
}

export function isDbReady(): boolean {
  return dbReady;
}
