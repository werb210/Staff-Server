// server/src/db/registry.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";

import * as schema from "./schema.js";

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL missing");
  process.exit(1);
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // required for Azure
});

export const db = drizzle(pool, { schema });
export { schema };
