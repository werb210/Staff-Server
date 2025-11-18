// ============================================================================
// server/src/services/userTokenService.ts
// Unified service rewrite (BLOCK 17)
// ============================================================================

import db from "../db/index.js";
import crypto from "crypto";

/**
 * Generate secure random token
 */
function generateToken() {
  return crypto.randomBytes(48).toString("hex");
}

const userTokenService = {
  /**
   * Create a new token for a user
   * @param {string} userId
   * @param {"auth" | "password_reset" | "verify"} type
   * @param {number} ttlMinutes
   */
  async create(userId, type, ttlMinutes = 30) {
    const token = generateToken();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    return db.userToken.create({
      data: {
        token,
        type,
        userId,
        expiresAt,
        consumed: false,
      },
      select: {
        token: true,
        expiresAt: true,
        type: true,
      },
    });
  },

  /**
   * Validate token (must exist, not expired, not consumed)
   * @param {string} token
   */
  async validate(token) {
    const record = await db.userToken.findUnique({
      where: { token },
    });

    if (!record) throw new Error("Invalid token");
    if (record.consumed) throw new Error("Token already used");
    if (record.expiresAt < new Date()) throw new Error("Token expired");

    return record;
  },

  /**
   * Consume token so it cannot be reused
   * @param {string} token
   */
  async consume(token) {
    const record = await db.userToken.findUnique({ where: { token } });
    if (!record) throw new Error("Invalid token");

    return db.userToken.update({
      where: { token },
      data: { consumed: true },
    });
  },

  /**
   * Purge expired tokens (safe scheduled task)
   */
  async purgeExpired() {
    const now = new Date();
    const result = await db.userToken.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    return {
      purged: result.count,
      timestamp: now.toISOString(),
    };
  },
};

export default userTokenService;

// ============================================================================
// END OF FILE
// ============================================================================
