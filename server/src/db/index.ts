import { Client } from "pg";

let client: Client | null = null;

export async function connectDb() {
  if (client) return client;

  client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  return client;
}

export async function db() {
  const c = await connectDb();
  return c;
}
