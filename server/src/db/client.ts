import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "../config/config";
import * as schema from "./schema";

const pool = new Pool({ connectionString: config.AZURE_POSTGRES_URL });

export const db: NodePgDatabase<typeof schema> = drizzle(pool, { schema });
export const pgPool = pool;
