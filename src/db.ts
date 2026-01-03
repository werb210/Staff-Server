import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL missing");
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }

  return pool;
}

/**
 * Explicit DB check — called ONLY by /ready
 */
export async function checkDb(): Promise<void> {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query("select 1");
  } finally {
    client.release();
  }
}

export { getPool };
