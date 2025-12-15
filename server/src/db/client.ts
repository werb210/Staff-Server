import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { pool } from "../db";
import * as schema from "./schema";

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
export const pgPool = pool;
