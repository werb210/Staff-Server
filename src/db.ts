// src/db.ts
import pg from "pg";

const { Pool } = pg;

// Keep the env check (fail-fast is correct)
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * Lazily-created singleton Pool.
 * IMPORTANT:
 * - We keep the internal variable named `_pool` so we can ALSO export a public `pool`
 *   (many files import `{ pool }`).
 */
let _pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (_pool) return _pool;

  // Azure Postgres requires SSL; rejectUnauthorized=false is typical for managed PG unless you pin CA.
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },

    // Cold starts / first connection can exceed 5s on Azure; 15s prevents false timeouts.
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 30_000,
    max: 10,

    // Helps keep sockets stable in hosted environments
    keepAlive: true,
  });

  // Apply server-side statement timeout per connection (best-effort; do not block startup)
  _pool.on("connect", (client) => {
    client.query("SET statement_timeout TO 5000").catch(() => {});
  });

  // Log pool errors (do not crash process)
  _pool.on("error", (err) => {
    console.error("PG_POOL_ERROR", err);
  });

  return _pool;
}

/**
 * Back-compat export:
 * Existing code imports `{ pool }` from "../db".
 * This creates the Pool object immediately, but does NOT connect until first query.
 */
export const pool: pg.Pool = getPool();

/**
 * Optional helper for graceful shutdown
 */
export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end().catch(() => {});
    _pool = null;
  }
}
