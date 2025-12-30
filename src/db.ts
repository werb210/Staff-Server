import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL_MISSING");
}

export const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function assertDb() {
  const res = await pool.query("select 1");
  if (!res) {
    throw new Error("DB_UNAVAILABLE");
  }
}
