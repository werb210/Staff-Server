// server/src/db/registry.ts

import pkg from "pg";
const { Pool } = pkg;

import { env } from "../utils/env.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
