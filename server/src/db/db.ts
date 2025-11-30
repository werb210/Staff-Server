// server/src/db/db.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import 'dotenv/config';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Database-backed features are disabled.');
}

const pool = new Pool({ connectionString: databaseUrl });

export const db = drizzle(pool);
