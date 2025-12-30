import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("FATAL: DATABASE_URL is not set");
}

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "false" ? false : { rejectUnauthorized: false },
});

export async function initDb(): Promise<void> {
  try {
    await db.query("select 1");
    console.log("[db] connection established");
  } catch (err) {
    console.error("[db] connection FAILED");
    throw err;
  }
}
