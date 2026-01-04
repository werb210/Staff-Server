import { randomUUID } from "crypto";
import { type PoolClient } from "pg";
import { pool } from "../../db";

type Queryable = Pick<PoolClient, "query">;

export type AuditParams = {
  actorUserId: string | null;
  targetUserId: string | null;
  action: string;
  ip?: string | null;
  userAgent?: string | null;
  success: boolean;
  client?: Queryable;
};

export async function recordAuditEvent(params: AuditParams): Promise<void> {
  const runner = params.client ?? pool;
  await runner.query(
    `insert into audit_events
     (id, actor_user_id, target_user_id, action, ip, user_agent, success, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, now())`,
    [
      randomUUID(),
      params.actorUserId,
      params.targetUserId,
      params.action,
      params.ip ?? null,
      params.userAgent ?? null,
      params.success,
    ]
  );
}
