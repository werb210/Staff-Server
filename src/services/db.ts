import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL missing");
}

export const db = new Pool({ connectionString: databaseUrl });
