import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("missing_env:DATABASE_URL");
  }

  if (!pool) {
    pool = new Pool({ connectionString: url });
  }

  return pool;
}

export async function checkDbConnection(): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return false;
  }

  if (!pool) {
    pool = new Pool({ connectionString: url });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query("select 1");
    } finally {
      client.release();
    }
    return true;
  } catch {
    return false;
  }
}
