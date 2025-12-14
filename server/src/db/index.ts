import { Client } from "pg";

let client: Client | null = null;

export async function connectDb() {
  if (!client) {
    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
  }
  return client;
}

export function getDb() {
  if (!client) {
    throw new Error("DB not connected");
  }
  return client;
}
