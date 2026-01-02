import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
  max: 5,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 3000,
});

/* HARD SAFETY */
pool.on("connect", async (client) => {
  await client.query("SET statement_timeout = 3000"); // 3s HARD STOP
});

pool.on("error", (err) => {
  console.error("PG_POOL_ERROR", err);
});
