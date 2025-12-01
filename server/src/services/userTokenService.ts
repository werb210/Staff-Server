// ============================================================================
// server/src/services/userTokenService.ts
// BLOCK 30 — User Token Service (Prisma-based)
// ============================================================================

import crypto from "crypto";

const prismaRemoved = () => {
  throw new Error("Prisma has been removed — pending Drizzle migration in Block 14");
};

const userTokenService = {
  /**
   * Create a new token for login, 2FA, password reset, etc.
  */
  async createToken(userId: string, type: "auth" | "reset" | "verify") {
    const token = crypto.randomBytes(32).toString("hex");

    prismaRemoved();
  },

  /**
   * Validate & consume token (one-time use)
  */
  async useToken(token: string, type: "auth" | "reset" | "verify") {
    prismaRemoved();
  },

  /**
   * Delete all tokens for a user (logout everywhere)
  */
  async clearTokensForUser(userId: string) {
    prismaRemoved();
  },
};

export default userTokenService;

// ============================================================================
// END OF FILE
// ============================================================================
