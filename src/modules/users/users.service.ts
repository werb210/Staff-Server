import { AppError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import { findAuthUserById, setUserActive } from "../auth/auth.repo";

export async function setUserStatus(params: {
  userId: string;
  active: boolean;
  actorId: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const user = await findAuthUserById(params.userId);
  if (!user) {
    throw new AppError("not_found", "User not found.", 404);
  }
  await setUserActive(params.userId, params.active);
  await recordAuditEvent({
    event: params.active ? "user_enabled" : "user_disabled",
    userId: params.userId,
    ip: params.ip,
    userAgent: params.userAgent,
    metadata: { actorId: params.actorId },
  });
}
