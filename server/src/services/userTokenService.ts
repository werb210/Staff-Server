// =============================================================================
// server/src/services/userTokenService.ts
// BLOCK 30 — User Token Service (Prisma-based)
// =============================================================================

import { prisma } from "../db/prisma";
import crypto from "crypto";

const userTokenService = {
  /**
   * Create a new token for login, 2FA, password reset, etc.
   */
  async createToken(userId: string, type: "auth" | "reset" | "verify") {
    const token = crypto.randomBytes(32).toString("hex");

    return prisma.userToken.create({
      data: {
        userId,
        token,
        type,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours default
      },
      select: {
        id: true,
        userId: true,
        token: true,
        type: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  },

  /**
   * Validate & consume token (one-time use)
   */
  async useToken(token: string, type: "auth" | "reset" | "verify") {
    const found = await prisma.userToken.findFirst({
      where: {
        token,
        type,
        expiresAt: { gt: new Date() },
      },
    });

    if (!found) return null;

    await prisma.userToken.delete({
      where: { id: found.id },
    });

    return found;
  },

  /**
   * Delete all tokens for a user (logout everywhere)
   */
  async clearTokensForUser(userId: string) {
    return prisma.userToken.deleteMany({
      where: { userId },
    });
  },
};

export default userTokenService;

// =============================================================================
// END OF FILE
// =============================================================================
