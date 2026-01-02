import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  // Crash fast if env is missing (this is correct behavior)
  throw new Error("DATABASE_URL is not set");
}

// Azure Postgres needs SSL; rejectUnauthorized false is typical for managed PG
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000, // prevents “hang forever”
});

// Apply server-side statement timeout per connection (prevents long queries)
pool.on("connect", (client) => {
  // fire-and-forget; do not block connect event
  client.query("SET statement_timeout TO 5000").catch(() => {});
});

// Optional: log pool errors (do not crash process)
pool.on("error", (err) => {
  console.error("PG_POOL_ERROR", err);
});
