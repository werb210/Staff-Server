import { Client } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function verifyDbConnection() {
  try {
    await dbClient.connect();
    await dbClient.query("select 1");
    console.log("Database connection OK");
  } catch (err) {
    console.error("Database connection FAILED");
    throw err;
  }
}
