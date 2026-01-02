import pg from "pg";

const { Pool } = pg;

/**
 * HARD FAIL if DATABASE_URL is missing.
 * This is intentional and correct.
 */
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * SINGLE shared pool instance.
 * Must be exported by name — many modules depend on it.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // REQUIRED for Azure PostgreSQL
  },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

/**
 * Warm the DB connection once after startup.
 * Failure must NOT crash the process.
 */
export async function warmDb(): Promise<void> {
  try {
    await pool.query("SELECT 1");
    console.log("DB warm OK");
  } catch (err) {
    console.error("DB warm FAILED", err);
  }
}

/**
 * Log pool-level errors without killing the app.
 */
pool.on("error", (err) => {
  console.error("PG_POOL_ERROR", err);
});
