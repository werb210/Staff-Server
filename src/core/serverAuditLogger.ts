import { pool } from "../db";

export async function logServerAudit(params: {
  correlationId: string;
  actionType: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  const { correlationId, actionType, entityType, entityId, metadata = null } = params;

  await pool.query(
    `INSERT INTO maya_audit_log
      (correlation_id, agent_name, action_type, entity_type, entity_id, metadata)
      VALUES ($1,'Server',$2,$3,$4,$5)`,
    [correlationId, actionType, entityType, entityId, metadata]
  );
}
