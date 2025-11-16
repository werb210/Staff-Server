import pkg from "pg";
const { Pool } = pkg;

import env from "./utils/env.js";

let pool: pkg.Pool;

/**
 * Prevent multiple pools from being created in Azure (hot reload / multiple workers).
 * Reuse the singleton if it exists.
 */
// @ts-ignore
if (!global.__BorealDbPool) {
  // Create the pool once
  // SSL is required for Azure Postgres
  global.__BorealDbPool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

// @ts-ignore
pool = global.__BorealDbPool;

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  return pool.query(text, params);
}

export async function getClient(): Promise<pkg.PoolClient> {
  return pool.connect();
}

export default {
  query,
  getClient,
  pool,
};
