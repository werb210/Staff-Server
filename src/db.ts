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
      logWarn("backup_retention_disabled", {
        retentionDays,
        geoRedundant,
      });
      return;
    }

    logInfo("backup_retention_configured", {
      retentionDays,
      geoRedundant,
    });
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
  { table: "users", column: "id" },
  { table: "users", column: "email" },
  { table: "users", column: "password_hash" },
  { table: "users", column: "role" },
  { table: "users", column: "active" },
  { table: "users", column: "password_changed_at" },
  { table: "users", column: "failed_login_attempts" },
  { table: "users", column: "locked_until" },
  { table: "users", column: "token_version" },
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
  { table: "audit_events", column: "id" },
  { table: "audit_events", column: "actor_user_id" },
  { table: "audit_events", column: "target_user_id" },
  { table: "audit_events", column: "target_type" },
  { table: "audit_events", column: "target_id" },
  { table: "audit_events", column: "event_type" },
  { table: "audit_events", column: "event_action" },
  { table: "audit_events", column: "ip_address" },
  { table: "audit_events", column: "user_agent" },
  { table: "audit_events", column: "request_id" },
  { table: "audit_events", column: "success" },
  { table: "audit_events", column: "created_at" },
  { table: "applications", column: "id" },
  { table: "applications", column: "owner_user_id" },
  { table: "applications", column: "name" },
  { table: "applications", column: "metadata" },
  { table: "applications", column: "product_type" },
  { table: "applications", column: "pipeline_state" },
  { table: "applications", column: "created_at" },
  { table: "applications", column: "updated_at" },
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
  { table: "idempotency_keys", column: "id" },
  { table: "idempotency_keys", column: "actor_user_id" },
  { table: "idempotency_keys", column: "scope" },
  { table: "idempotency_keys", column: "idempotency_key" },
  { table: "idempotency_keys", column: "status_code" },
  { table: "idempotency_keys", column: "response_body" },
  { table: "idempotency_keys", column: "created_at" },
  { table: "lender_submissions", column: "id" },
  { table: "lender_submissions", column: "application_id" },
  { table: "lender_submissions", column: "status" },
  { table: "lender_submissions", column: "idempotency_key" },
  { table: "lender_submissions", column: "lender_id" },
  { table: "lender_submissions", column: "submitted_at" },
  { table: "lender_submissions", column: "payload" },
  { table: "lender_submissions", column: "created_at" },
  { table: "lender_submissions", column: "updated_at" },
  { table: "reporting_daily_metrics", column: "id" },
  { table: "reporting_daily_metrics", column: "metric_date" },
  { table: "reporting_daily_metrics", column: "applications_created" },
  { table: "reporting_daily_metrics", column: "applications_submitted" },
  { table: "reporting_daily_metrics", column: "applications_approved" },
  { table: "reporting_daily_metrics", column: "applications_declined" },
  { table: "reporting_daily_metrics", column: "applications_funded" },
  { table: "reporting_daily_metrics", column: "documents_uploaded" },
  { table: "reporting_daily_metrics", column: "documents_approved" },
  { table: "reporting_daily_metrics", column: "lender_submissions" },
  { table: "reporting_daily_metrics", column: "created_at" },
  { table: "reporting_pipeline_snapshots", column: "id" },
  { table: "reporting_pipeline_snapshots", column: "snapshot_at" },
  { table: "reporting_pipeline_snapshots", column: "pipeline_state" },
  { table: "reporting_pipeline_snapshots", column: "application_count" },
  { table: "reporting_lender_performance", column: "id" },
  { table: "reporting_lender_performance", column: "lender_id" },
  { table: "reporting_lender_performance", column: "period_start" },
  { table: "reporting_lender_performance", column: "period_end" },
  { table: "reporting_lender_performance", column: "submissions" },
  { table: "reporting_lender_performance", column: "approvals" },
  { table: "reporting_lender_performance", column: "declines" },
  { table: "reporting_lender_performance", column: "funded" },
  { table: "reporting_lender_performance", column: "avg_decision_time_seconds" },
  { table: "reporting_lender_performance", column: "created_at" },
  { table: "reporting_pipeline_daily_snapshots", column: "id" },
  { table: "reporting_pipeline_daily_snapshots", column: "snapshot_date" },
  { table: "reporting_pipeline_daily_snapshots", column: "pipeline_state" },
  { table: "reporting_pipeline_daily_snapshots", column: "application_count" },
  { table: "reporting_pipeline_daily_snapshots", column: "created_at" },
  { table: "reporting_application_volume_daily", column: "id" },
  { table: "reporting_application_volume_daily", column: "metric_date" },
  { table: "reporting_application_volume_daily", column: "product_type" },
  { table: "reporting_application_volume_daily", column: "applications_created" },
  { table: "reporting_application_volume_daily", column: "applications_submitted" },
  { table: "reporting_application_volume_daily", column: "applications_approved" },
  { table: "reporting_application_volume_daily", column: "applications_declined" },
  { table: "reporting_application_volume_daily", column: "applications_funded" },
  { table: "reporting_application_volume_daily", column: "created_at" },
  { table: "reporting_document_metrics_daily", column: "id" },
  { table: "reporting_document_metrics_daily", column: "metric_date" },
  { table: "reporting_document_metrics_daily", column: "document_type" },
  { table: "reporting_document_metrics_daily", column: "documents_uploaded" },
  { table: "reporting_document_metrics_daily", column: "documents_reviewed" },
  { table: "reporting_document_metrics_daily", column: "documents_approved" },
  { table: "reporting_document_metrics_daily", column: "created_at" },
  { table: "reporting_staff_activity_daily", column: "id" },
  { table: "reporting_staff_activity_daily", column: "metric_date" },
  { table: "reporting_staff_activity_daily", column: "staff_user_id" },
  { table: "reporting_staff_activity_daily", column: "action" },
  { table: "reporting_staff_activity_daily", column: "activity_count" },
  { table: "reporting_staff_activity_daily", column: "created_at" },
  { table: "reporting_lender_funnel_daily", column: "id" },
  { table: "reporting_lender_funnel_daily", column: "metric_date" },
  { table: "reporting_lender_funnel_daily", column: "lender_id" },
  { table: "reporting_lender_funnel_daily", column: "submissions" },
  { table: "reporting_lender_funnel_daily", column: "approvals" },
  { table: "reporting_lender_funnel_daily", column: "funded" },
  { table: "reporting_lender_funnel_daily", column: "created_at" },
  { table: "ops_kill_switches", column: "key" },
  { table: "ops_kill_switches", column: "enabled" },
  { table: "ops_kill_switches", column: "updated_at" },
  { table: "ops_replay_jobs", column: "id" },
  { table: "ops_replay_jobs", column: "scope" },
  { table: "ops_replay_jobs", column: "started_at" },
  { table: "ops_replay_jobs", column: "completed_at" },
  { table: "ops_replay_jobs", column: "status" },
  { table: "ops_replay_events", column: "id" },
  { table: "ops_replay_events", column: "replay_job_id" },
  { table: "ops_replay_events", column: "source_table" },
  { table: "ops_replay_events", column: "source_id" },
  { table: "ops_replay_events", column: "processed_at" },
  { table: "export_audit", column: "id" },
  { table: "export_audit", column: "actor_user_id" },
  { table: "export_audit", column: "export_type" },
  { table: "export_audit", column: "filters" },
  { table: "export_audit", column: "created_at" },
  { table: "ocr_jobs", column: "id" },
  { table: "ocr_jobs", column: "document_id" },
  { table: "ocr_jobs", column: "application_id" },
  { table: "ocr_jobs", column: "status" },
  { table: "ocr_jobs", column: "attempt_count" },
  { table: "ocr_jobs", column: "max_attempts" },
  { table: "ocr_jobs", column: "next_attempt_at" },
  { table: "ocr_jobs", column: "locked_at" },
  { table: "ocr_jobs", column: "locked_by" },
  { table: "ocr_jobs", column: "last_error" },
  { table: "ocr_jobs", column: "created_at" },
  { table: "ocr_jobs", column: "updated_at" },
  { table: "ocr_results", column: "id" },
  { table: "ocr_results", column: "document_id" },
  { table: "ocr_results", column: "provider" },
  { table: "ocr_results", column: "model" },
  { table: "ocr_results", column: "extracted_text" },
  { table: "ocr_results", column: "extracted_json" },
  { table: "ocr_results", column: "meta" },
  { table: "ocr_results", column: "created_at" },
  { table: "ocr_results", column: "updated_at" },
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
