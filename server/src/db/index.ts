import { Client } from "pg";

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

let connected = false;

export async function getDb() {
  if (!connected) {
    await client.connect();
    connected = true;
  }
  return client;
}
