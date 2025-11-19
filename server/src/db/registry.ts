import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ENV } from "../utils/env.js";
import { pipeline } from "./schema/pipeline.js";
import { products } from "./schema/products.js";

const pool = new Pool({ connectionString: ENV.DATABASE_URL });

export const db = drizzle(pool, {
  schema: {
    pipeline,
    products,
  },
});

export type Database = typeof db;
export { pool };
