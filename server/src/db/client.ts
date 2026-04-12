import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
  query_timeout: 10000,
  idleTimeoutMillis: 30000,
  keepAlive: true
});


async function ensureLiveChatRequestsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS live_chat_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phone_number TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

export async function testDb() {
  const start = Date.now();

  const client = await pool.connect();

  try {
    await client.query('SELECT 1');
    await ensureLiveChatRequestsTable();
    console.log('DB OK in', Date.now() - start, 'ms');
  } finally {
    client.release();
  }
}

export async function waitForDb(retries = 5, delayMs = 3000) {
  for (let i = 0; i < retries; i += 1) {
    try {
      await pool.query('SELECT 1');
      await ensureLiveChatRequestsTable();
      console.log('DB READY');
      return true;
    } catch (err) {
      console.error(`DB retry ${i + 1}/${retries}`, err);

      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  return false;
}
