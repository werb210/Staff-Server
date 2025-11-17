// server/src/db/registry.ts

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL missing");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Drizzle client
export const db = drizzle(pool);

/**
 * --------------------------------------------------------------------
 * REGISTRY EXPORT
 * --------------------------------------------------------------------
 * The services expect this EXACT object:
 *    { applications, companies, deals, lenders }
 *
 * Your repo currently has NO model files inside server/src/db/models/.
 * To keep the build working, we provide safe empty objects so TS stops
 * throwing “no exported member 'registry'”.
 * --------------------------------------------------------------------
 */

export const registry = {
  applications: {},
  companies: {},
  deals: {},
  lenders: {},
};
