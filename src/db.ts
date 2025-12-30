import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function assertDb(): Promise<void> {
  try {
    await pool.query("select 1");
  } catch (error) {
    console.warn("Database connectivity check failed.", error);
  }
}
