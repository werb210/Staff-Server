import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  console.error("[PG POOL ERROR]", err.message);
  // IMPORTANT: do not crash process
});

export async function dbQuery<T = any>(text: string, params?: any[]) {
  try {
    return await pool.query<T>(text, params);
  } catch (err: any) {
    console.error("[PG QUERY ERROR]", err.message);
    throw err;
  }
}
