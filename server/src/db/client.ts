import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema/index.js";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to initialize the database client");
}

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
export type DatabaseClient = typeof db;
export { pool as poolClient };
