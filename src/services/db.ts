import { Pool } from "pg";

let pool: Pool | null = null;

export async function initDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL missing");
  }

  pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    await pool.query("SELECT 1");
  } catch (err) {
    console.error("DB CONNECTION FAILED");
    throw err;
  }
}

export function getDb() {
  if (!pool) throw new Error("DB not initialized");
  return pool;
}

export function isDbReady() {
  return pool !== null;
}
