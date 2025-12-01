// =============================================================================
// server/src/services/userTokenService.ts
// =============================================================================

import crypto from "crypto";
import auditLogsRepo from "../db/repositories/auditLogs.repo.js";

const userTokenService = {
  /**
   * Create a new token for login, 2FA, password reset, etc.
   */
  async createToken(userId: string, type: "auth" | "reset" | "verify") {
    const token = crypto.randomBytes(32).toString("hex");

    await auditLogsRepo.create({
      eventType: "user-token",
      userId,
      details: { token, type, consumed: false },
    } as any);

    return token;
  },

  /**
   * Validate & consume token (one-time use)
   */
  async useToken(token: string, type: "auth" | "reset" | "verify") {
    const records = await auditLogsRepo.findMany({ eventType: "user-token" } as any);
    const match = (records as any[]).find((r) => r.details?.token === token && r.details?.type === type);
    if (!match) return null;

    await auditLogsRepo.update(match.id, { details: { ...(match.details ?? {}), consumed: true } } as any);
    return { userId: match.userId, token };
  },

  /**
   * Delete all tokens for a user (logout everywhere)
   */
  async clearTokensForUser(userId: string) {
    const records = await auditLogsRepo.findMany({ userId, eventType: "user-token" } as any);
    await Promise.all((records as any[]).map((r) => auditLogsRepo.delete(r.id)));
  },
};

export default userTokenService;

// =============================================================================
// END OF FILE
// =============================================================================
