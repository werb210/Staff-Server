import { Pool } from "pg";
import { newDb } from "pg-mem";

let pool: Pool;

export async function initDb(): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    const db = newDb();

    db.public.none(`
      CREATE TABLE IF NOT EXISTS applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid()
      );
    `);

    const adapter = db.adapters.createPg();
    pool = new adapter.Pool();
    return;
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  await pool.query("select 1");
}

export function getPool(): Pool {
  if (!pool) {
    throw new Error("DB not initialized");
  }
  return pool;
}
