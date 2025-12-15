import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

import { config } from "./config/config";
import * as schema from "./db/schema";

const sslConfig = config.DATABASE_URL.includes("postgres.database.azure.com")
  ? { rejectUnauthorized: false }
  : undefined;

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: sslConfig,
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export async function verifyDatabaseConnection(): Promise<boolean> {
  const result = await db.execute<{ ok: number }>(sql`select 1 as ok`);
  return Array.isArray(result.rows) ? result.rows[0]?.ok === 1 : false;
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
