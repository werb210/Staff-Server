// server/src/db/registry.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as applicationModels from "./models/application.js";
import * as companyModels from "./models/company.js";
import * as dealModels from "./models/deal.js";
import * as lenderModels from "./models/lender.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL missing");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Drizzle client
export const db = drizzle(pool);

// Unified registry (expected by services)
export const registry = {
  ...applicationModels,
  ...companyModels,
  ...dealModels,
  ...lenderModels,
};

export default db;
