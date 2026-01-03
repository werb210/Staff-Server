import { randomUUID } from "crypto";
import { pool } from "../../db";

export type AuditParams = {
  actorUserId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  ip?: string | null;
  success: boolean;
};

export async function recordAuditEvent(params: AuditParams): Promise<void> {
  await pool.query(
    `insert into audit_logs
     (id, actor_user_id, action, entity, entity_id, ip, success, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, now())`,
    [
      randomUUID(),
      params.actorUserId ?? null,
      params.action,
      params.entity,
      params.entityId ?? null,
      params.ip ?? null,
      params.success,
    ]
  );
}
