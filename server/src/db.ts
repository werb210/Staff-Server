import { Pool } from "pg";
import { config } from "./config/config";

const sslConfig = config.DATABASE_URL.includes("postgres.database.azure.com")
  ? { rejectUnauthorized: false }
  : undefined;

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: sslConfig,
});

export async function verifyDatabaseConnection() {
  const result = await pool.query("select 1 as ok");
  return result.rows[0]?.ok === 1;
}
