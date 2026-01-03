import { AppError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import {
  findAuthUserById,
  incrementTokenVersion,
  revokeRefreshTokensForUser,
  setUserActive,
  updateUserRole,
} from "../auth/auth.repo";
import { type Role } from "../../auth/roles";
import { pool } from "../../db";

export async function setUserStatus(params: {
  userId: string;
  active: boolean;
  actorId: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const user = await findAuthUserById(params.userId);
  if (!user) {
    await recordAuditEvent({
      action: params.active ? "user_enable" : "user_disable",
      userId: params.actorId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
    });
    throw new AppError("not_found", "User not found.", 404);
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setUserActive(params.userId, params.active, client);
    if (!params.active) {
      await incrementTokenVersion(params.userId, client);
      await revokeRefreshTokensForUser(params.userId, client);
    }
    await client.query("commit");
    await recordAuditEvent({
      action: params.active ? "user_enable" : "user_disable",
      userId: params.actorId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
    });
  } catch (err) {
    await client.query("rollback");
    await recordAuditEvent({
      action: params.active ? "user_enable" : "user_disable",
      userId: params.actorId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
    });
    throw err;
  } finally {
    client.release();
  }
}

export async function changeUserRole(params: {
  userId: string;
  role: Role;
  actorId: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const user = await findAuthUserById(params.userId);
  if (!user) {
    await recordAuditEvent({
      action: "user_role_change",
      userId: params.actorId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
    });
    throw new AppError("not_found", "User not found.", 404);
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    await updateUserRole(params.userId, params.role, client);
    await incrementTokenVersion(params.userId, client);
    await revokeRefreshTokensForUser(params.userId, client);
    await client.query("commit");
    await recordAuditEvent({
      action: "user_role_change",
      userId: params.actorId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
    });
  } catch (err) {
    await client.query("rollback");
    await recordAuditEvent({
      action: "user_role_change",
      userId: params.actorId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
    });
    throw err;
  } finally {
    client.release();
  }
}
