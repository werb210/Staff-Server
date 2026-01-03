import { randomUUID } from "crypto";
import { pool } from "../../db";

export type AuditEvent =
  | "login_success"
  | "login_failure"
  | "token_issued"
  | "password_reset_requested"
  | "password_changed"
  | "user_disabled"
  | "user_enabled";

type AuditParams = {
  event: AuditEvent;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function recordAuditEvent(params: AuditParams): Promise<void> {
  try {
    await pool.query(
      `insert into audit_logs (id, event, user_id, ip, user_agent, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, now())`,
      [
        randomUUID(),
        params.event,
        params.userId ?? null,
        params.ip ?? null,
        params.userAgent ?? null,
        params.metadata ?? null,
      ]
    );
  } catch (err) {
    // Fallback to structured logging if DB unavailable.
    console.error("audit_log_failed", {
      error: err instanceof Error ? err.message : String(err),
      ...params,
    });
  }
}
