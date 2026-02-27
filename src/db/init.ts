import { Pool } from "pg";
import { newDb } from "pg-mem";

let pool: Pool | null = null;

export async function initDb(): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    const db = newDb({
      autoCreateForeignKeyIndices: true,
    });

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
    throw new Error("Database not initialized");
  }
  return pool;
}
