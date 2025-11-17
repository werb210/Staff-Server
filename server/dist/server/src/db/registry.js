import pg from "pg";
const { Pool } = pg;

export const registry = {
  system: new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  }),
};
