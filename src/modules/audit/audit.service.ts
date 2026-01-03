import { randomUUID } from "crypto";
import { pool } from "../../db";

export type AuditParams = {
  userId?: string | null;
  action: string;
  ip?: string | null;
  userAgent?: string | null;
  success: boolean;
};

export async function recordAuditEvent(params: AuditParams): Promise<void> {
  await pool.query(
    `insert into audit_events
     (id, user_id, action, ip, user_agent, success, created_at)
     values ($1, $2, $3, $4, $5, $6, now())`,
    [
      randomUUID(),
      params.userId ?? null,
      params.action,
      params.ip ?? null,
      params.userAgent ?? null,
      params.success,
    ]
  );
}
