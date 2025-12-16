import { config } from "../config/config";
import { db } from "../db";
import { auditLogs } from "../db/schema";
import { passwordService } from "../services/password.service";
import { sessionService } from "../services/session.service";
import { findUserByEmail, findUserById, mapAuthenticated } from "../services/user.service";
import { AuthenticatedUser, LoginRequestBody, LoginResult, RefreshResult, RequestContext } from "./auth.types";
import { twilioVerifyService } from "../services/twilioVerify.service";

class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

async function recordLoginAudit(
  emailAttempt: string,
  eventType: "login_success" | "login_failure",
  ctx: RequestContext,
  userId?: string
) {
  await db.insert(auditLogs).values({
    emailAttempt,
    eventType,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
    userId,
  });
}

function validatePortalRole(user: AuthenticatedUser, portal?: string) {
  if (!portal) return;
  if (portal === "lender" && user.role !== "Lender") {
    throw new AuthError("Lender portal requires a Lender account", 403);
  }
  if (portal === "referrer" && user.role !== "Referrer") {
    throw new AuthError("Referrer portal requires a Referrer account", 403);
  }
}

export const authService = {
  async login(payload: LoginRequestBody, ctx: RequestContext): Promise<LoginResult> {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const userRecord = await findUserByEmail(normalizedEmail);
    if (config.NODE_ENV !== "production") {
      console.debug("Auth login user lookup", { email: normalizedEmail, found: Boolean(userRecord) });
    }
    if (!userRecord) {
      await recordLoginAudit(normalizedEmail, "login_failure", ctx);
      console.warn("Login failed: user not found", { email: normalizedEmail });
      throw new AuthError("Invalid credentials");
    }

    if (!userRecord.passwordHash) {
      await recordLoginAudit(normalizedEmail, "login_failure", ctx, userRecord.id);
      console.warn("Login failed: missing password hash", { email: normalizedEmail });
      throw new AuthError("Invalid credentials");
    }

    if (config.NODE_ENV !== "production") {
      console.debug("Auth login hash length", { email: normalizedEmail, hashLength: userRecord.passwordHash.length });
    }
    const passwordValid = await passwordService.verifyPassword(payload.password, userRecord.passwordHash);
    if (config.NODE_ENV !== "production") {
      console.debug("Auth login bcrypt compare result", { email: normalizedEmail, passwordValid });
    }
    if (!passwordValid) {
      await recordLoginAudit(normalizedEmail, "login_failure", ctx, userRecord.id);
      console.warn("Login failed: invalid password", { email: normalizedEmail });
      throw new AuthError("Invalid credentials");
    }

    const user = mapAuthenticated(userRecord)!;
    try {
      validatePortalRole(user, payload.portal);
    } catch (error) {
      await recordLoginAudit(normalizedEmail, "login_failure", ctx, user.id);
      throw error;
    }
    try {
      await twilioVerifyService.verifyCode(user.email, payload.verificationCode);
    } catch (error) {
      await recordLoginAudit(normalizedEmail, "login_failure", ctx, user.id);
      throw new AuthError(
        error instanceof Error ? error.message : "Two-factor verification failed",
        401,
      );
    }

    await recordLoginAudit(normalizedEmail, "login_success", ctx, user.id);

    const tokens = await sessionService.createSession(user);
    return { user, tokens };
  },

  async logout(sessionId?: string, refreshToken?: string) {
    if (refreshToken) {
      try {
        const { payload } = await sessionService.validateRefreshToken(refreshToken);
        await sessionService.revokeSession(payload.sessionId);
        return;
      } catch {
        // ignore and fall back to sessionId-based revocation
      }
    }
    await sessionService.revokeSession(sessionId);
  },

  async refresh(refreshToken: string): Promise<RefreshResult> {
    const { payload } = await sessionService.validateRefreshToken(refreshToken);
    const userRecord = await findUserById(payload.userId);
    if (!userRecord) {
      await sessionService.revokeSession(payload.sessionId);
      throw new AuthError("User not found", 401);
    }
    const user = mapAuthenticated(userRecord)!;
    const tokens = await sessionService.refreshSession(user, refreshToken);
    return { user, tokens };
  },
};

export { AuthError };
