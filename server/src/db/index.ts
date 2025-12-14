import { Client } from "pg";

export const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function connectDb() {
  if (db._connected) return;
  await db.connect();
  (db as any)._connected = true;
}
