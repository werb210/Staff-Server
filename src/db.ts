import { Pool } from "pg";
import {
  getDbPoolConnectionTimeoutMs,
  getDbPoolIdleTimeoutMs,
  getDbPoolMax,
} from "./config";
import { logError, logInfo, logWarn } from "./observability/logger";

export const isPgMem =
  process.env.NODE_ENV === "test" &&
  (!process.env.DATABASE_URL || process.env.DATABASE_URL === "pg-mem");

function createPool(): Pool {
  if (isPgMem) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { newDb } = require("pg-mem") as typeof import("pg-mem");
    const db = newDb({ autoCreateForeignKeyIndices: false });
    const adapter = db.adapters.createPg();
    return new adapter.Pool();
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
    max: getDbPoolMax(),
    idleTimeoutMillis: getDbPoolIdleTimeoutMs(),
    connectionTimeoutMillis: getDbPoolConnectionTimeoutMs(),
  });
}

export const pool = createPool();

export async function checkDb(): Promise<void> {
  try {
    await pool.query("select 1");
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    logError("db_unavailable", { error: message });
    throw err;
  }
}

export async function logBackupStatus(): Promise<void> {
  try {
    const res = await pool.query<{ name: string; setting: string }>(
      `select name, setting
       from pg_settings
       where name in ('backup_retention_days', 'geo_redundant_backup')`
    );
    const settings = new Map(res.rows.map((row) => [row.name, row.setting]));
    const retentionRaw = settings.get("backup_retention_days");
    const retentionDays = retentionRaw ? Number(retentionRaw) : null;
    const geoRedundant = settings.get("geo_redundant_backup") ?? "unknown";

    if (!retentionDays || retentionDays <= 0) {
      logWarn("backup_retention_disabled", { retentionDays, geoRedundant });
      return;
    }

    logInfo("backup_retention_configured", { retentionDays, geoRedundant });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    logWarn("backup_retention_check_failed", { error: message });
  }
}

type RequiredColumn = {
  table: string;
  column: string;
};

const requiredColumns: RequiredColumn[] = [
  // users
  { table: "users", column: "id" },
  { table: "users", column: "email" },
  { table: "users", column: "password_hash" },
  { table: "users", column: "role" },
  { table: "users", column: "active" },
  { table: "users", column: "password_changed_at" },
  { table: "users", column: "failed_login_attempts" },
  { table: "users", column: "locked_until" },
  { table: "users", column: "token_version" },

  // auth
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
  { table: "password_resets", column: "created_at" },

  // audit_events — ALIGNED TO LIVE DB (INTENTIONALLY DUPLICATIVE)
  { table: "audit_events", column: "id" },
  { table: "audit_events", column: "actor_user_id" },
  { table: "audit_events", column: "target_user_id" },
  { table: "audit_events", column: "target_type" },
  { table: "audit_events", column: "target_id" },
  { table: "audit_events", column: "event_type" },
  { table: "audit_events", column: "event_action" },
  { table: "audit_events", column: "action" },
  { table: "audit_events", column: "ip" },
  { table: "audit_events", column: "ip_address" },
  { table: "audit_events", column: "user_agent" },
  { table: "audit_events", column: "request_id" },
  { table: "audit_events", column: "success" },
  { table: "audit_events", column: "created_at" },

  // applications
  { table: "applications", column: "id" },
  { table: "applications", column: "owner_user_id" },
  { table: "applications", column: "name" },
  { table: "applications", column: "metadata" },
  { table: "applications", column: "product_type" },
  { table: "applications", column: "pipeline_state" },
  { table: "applications", column: "created_at" },
  { table: "applications", column: "updated_at" },

  // documents
  { table: "documents", column: "id" },
  { table: "documents", column: "application_id" },
  { table: "documents", column: "owner_user_id" },
  { table: "documents", column: "title" },
  { table: "documents", column: "document_type" },
  { table: "documents", column: "created_at" },

  { table: "document_versions", column: "id" },
  { table: "document_versions", column: "document_id" },
  { table: "document_versions", column: "version" },
  { table: "document_versions", column: "metadata" },
  { table: "document_versions", column: "content" },
  { table: "document_versions", column: "created_at" },

  { table: "document_version_reviews", column: "id" },
  { table: "document_version_reviews", column: "document_version_id" },
  { table: "document_version_reviews", column: "status" },
  { table: "document_version_reviews", column: "reviewed_by_user_id" },
  { table: "document_version_reviews", column: "reviewed_at" },
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
    throw new Error(
      `schema_mismatch_missing_columns:${missing
        .map((m) => `${m.table}.${m.column}`)
        .join(",")}`
    );
  }
}
