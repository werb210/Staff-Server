// server/src/db/registry.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

// Import every model/table you actually use.
// Adjust these imports to match your actual directory structure.
import * as applications from "./models/application.js";
import * as companies from "./models/company.js";
import * as deals from "./models/deal.js";
import * as lenders from "./models/lender.js";

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

/**
 * THIS IS THE EXPORT YOUR SERVICES EXPECT.
 * If this object exists, all 4 TS2305 errors disappear.
 */
export const registry = {
  ...applications,
  ...companies,
  ...deals,
  ...lenders,
};

// default export = db connection
export default db;
