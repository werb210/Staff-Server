import { AppError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import { findAuthUserById, setUserActive } from "../auth/auth.repo";
import { pool } from "../../db";

export async function setUserStatus(params: {
  userId: string;
  active: boolean;
  actorId: string;
  ip?: string;
}): Promise<void> {
  const user = await findAuthUserById(params.userId);
  if (!user) {
    await recordAuditEvent({
      action: params.active ? "user_enable" : "user_disable",
      entity: "user",
      entityId: params.userId,
      actorUserId: params.actorId,
      ip: params.ip,
      success: false,
    });
    throw new AppError("not_found", "User not found.", 404);
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setUserActive(params.userId, params.active, client);
    await client.query("commit");
    await recordAuditEvent({
      action: params.active ? "user_enable" : "user_disable",
      entity: "user",
      entityId: params.userId,
      actorUserId: params.actorId,
      ip: params.ip,
      success: true,
    });
  } catch (err) {
    await client.query("rollback");
    await recordAuditEvent({
      action: params.active ? "user_enable" : "user_disable",
      entity: "user",
      entityId: params.userId,
      actorUserId: params.actorId,
      ip: params.ip,
      success: false,
    });
    throw err;
  } finally {
    client.release();
  }
}
