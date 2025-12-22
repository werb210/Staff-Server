import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "./pool.js";

export const db = drizzle(pool);
