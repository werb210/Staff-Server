import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { pool } from "./pool";
export const db = drizzle(pool, { schema });
export async function verifyDatabaseConnection() {
    const result = await db.execute(sql `select 1 as ok`);
    return Array.isArray(result.rows) ? result.rows[0]?.ok === 1 : false;
}
export async function closeDatabase() {
    await pool.end();
}
export async function assertDatabaseConnection() {
    try {
        const ok = await verifyDatabaseConnection();
        if (!ok) {
            throw new Error("Database connectivity check failed: SELECT 1 returned unexpected result");
        }
    }
    catch (error) {
        console.error("Database connection failed", error);
        throw error;
    }
}
