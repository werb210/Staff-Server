import { Client } from "pg";

let client: Client | null = null;

export async function connectDb() {
  if (client) return client;

  client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  return client;
}

export async function query(text: string, params?: any[]) {
  const c = await connectDb();
  return c.query(text, params);
}
