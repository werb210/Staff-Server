import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "../config/config";

const connectionString = config.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const needsSsl =
  connectionString.includes("sslmode=require") ||
  process.env.PGSSLMODE === "require" ||
  process.env.DATABASE_SSL === "true";

export const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool);
