// server/src/db/db.ts
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ENV } from "../config/env.js";

const databaseUrl = ENV.DATABASE_URL;

let pool: Pool | null = null;
let dbInstance: NodePgDatabase | null = null;

if (databaseUrl) {
  pool = new Pool({ connectionString: databaseUrl });
  dbInstance = drizzle(pool);
} else {
  console.warn(
    "DATABASE_URL is not set. Database-backed features are disabled until it is provided.",
  );
}

const createUnavailableDb = (): NodePgDatabase =>
  new Proxy(
    {},
    {
      get() {
        throw new Error("Database is not configured. Set DATABASE_URL to enable DB access.");
      },
    },
  ) as NodePgDatabase;

export const db = dbInstance ?? createUnavailableDb();
export const pgPool = pool;
export const isDbConfigured = Boolean(dbInstance);
