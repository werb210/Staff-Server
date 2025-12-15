import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });

export async function verifyDatabaseConnection(): Promise<boolean> {
  const result = await db.execute<{ ok: number }>(sql`select 1 as ok`);
  return Array.isArray(result.rows) ? result.rows[0]?.ok === 1 : false;
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
