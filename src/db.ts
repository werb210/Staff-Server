import { Pool } from "pg";

function createPool(): Pool {
  if (
    process.env.NODE_ENV === "test" &&
    (!process.env.DATABASE_URL || process.env.DATABASE_URL === "pg-mem")
  ) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { newDb } = require("pg-mem") as typeof import("pg-mem");
    const db = newDb({ autoCreateForeignKeyIndices: true });
    const adapter = db.adapters.createPg();
    return new adapter.Pool();
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  });
}

export const pool = createPool();

export async function checkDb(): Promise<void> {
  await pool.query("select 1");
}

type RequiredColumn = {
  table: string;
  column: string;
};

const requiredColumns: RequiredColumn[] = [
  { table: "users", column: "id" },
  { table: "users", column: "email" },
  { table: "users", column: "password_hash" },
  { table: "users", column: "role" },
  { table: "users", column: "active" },
  { table: "users", column: "password_changed_at" },
  { table: "auth_refresh_tokens", column: "id" },
  { table: "auth_refresh_tokens", column: "user_id" },
  { table: "auth_refresh_tokens", column: "token_hash" },
  { table: "auth_refresh_tokens", column: "expires_at" },
  { table: "auth_refresh_tokens", column: "revoked_at" },
  { table: "auth_refresh_tokens", column: "created_at" },
  { table: "password_resets", column: "id" },
  { table: "password_resets", column: "user_id" },
  { table: "password_resets", column: "token_hash" },
  { table: "password_resets", column: "expires_at" },
  { table: "password_resets", column: "used_at" },
  { table: "audit_logs", column: "id" },
  { table: "audit_logs", column: "actor_user_id" },
  { table: "audit_logs", column: "action" },
  { table: "audit_logs", column: "entity" },
  { table: "audit_logs", column: "entity_id" },
  { table: "audit_logs", column: "ip" },
  { table: "audit_logs", column: "success" },
  { table: "audit_logs", column: "created_at" },
];

export async function assertSchema(): Promise<void> {
  const res = await pool.query<{ table_name: string; column_name: string }>(
    `select table_name, column_name
     from information_schema.columns
     where table_schema = 'public'`
  );
  const existing = new Set(
    res.rows.map((row) => `${row.table_name}.${row.column_name}`)
  );

  const missing = requiredColumns.filter(
    (item) => !existing.has(`${item.table}.${item.column}`)
  );

  if (missing.length > 0) {
    const list = missing.map((item) => `${item.table}.${item.column}`).join(", ");
    throw new Error(`schema_mismatch_missing_columns:${list}`);
  }
}
