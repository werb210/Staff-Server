import pkg from "pg";

const { Pool } = pkg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function dbWarm(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("select 1");
    console.log("DB warm OK");
  } finally {
    client.release();
  }
}
