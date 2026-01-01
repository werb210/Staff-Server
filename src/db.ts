import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 3000,
});

pool.on("error", (err) => {
  console.error("PG_POOL_ERROR", err);
});
