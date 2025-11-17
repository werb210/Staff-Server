// server/src/db/registry.ts
import pg from "pg";

export const registry = {
  pool: new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }),

  // basic query helper (optional but safe)
  async query(text: string, params?: any[]) {
    return this.pool.query(text, params);
  },
};
