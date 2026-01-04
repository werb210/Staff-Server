import { randomUUID } from "crypto";
import { type PoolClient } from "pg";
import { pool } from "../../db";
import { getRequestId } from "../../middleware/requestContext";

type Queryable = Pick<PoolClient, "query">;

export type AuditParams = {
  actorUserId: string | null;
  targetUserId: string | null;
  targetType?: string | null;
  targetId?: string | null;
  action: string;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  success: boolean;
  client?: Queryable;
};

export async function recordAuditEvent(params: AuditParams): Promise<void> {
  const runner = params.client ?? pool;
  const requestId = params.requestId ?? getRequestId() ?? null;
  await runner.query(
    `insert into audit_events
     (id, actor_user_id, target_user_id, target_type, target_id, action, ip, user_agent, request_id, success, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
    [
      randomUUID(),
      params.actorUserId,
      params.targetUserId,
      params.targetType ?? null,
      params.targetId ?? null,
      params.action,
      params.ip ?? null,
      params.userAgent ?? null,
      requestId,
      params.success,
    ]
  );
}
