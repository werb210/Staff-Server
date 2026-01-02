import pg from "pg";

const { Pool } = pg;

/**
 * We DO NOT create a Pool at import time.
 * Azure health probes must never block on Postgres.
 */

let pool: pg.Pool | null = null;

/**
 * Lazily initialize the pool on first actual DB use.
 */
export function getPool(): pg.Pool {
  if (pool) return pool;

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  // Apply per-connection statement timeout (non-blocking)
  pool.on("connect", (client) => {
    client.query("SET statement_timeout TO 5000").catch(() => {});
  });

  // Log pool errors but NEVER crash the process
  pool.on("error", (err) => {
    console.error("PG_POOL_ERROR", err);
  });

  return pool;
}

/**
 * Optional helper for graceful shutdown
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end().catch(() => {});
    pool = null;
  }
}
