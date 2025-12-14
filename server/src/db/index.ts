import { Client } from 'pg';

let client: Client | null = null;

export async function connectDb() {
  if (client) return client;

  client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  return client;
}

export function getDb() {
  if (!client) {
    throw new Error('DB not connected');
  }
  return client;
}
