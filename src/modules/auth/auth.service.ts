import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from "jsonwebtoken";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import {
  createPasswordReset,
  createUser,
  consumeRefreshToken,
  findAuthUserByEmail,
  findAuthUserById,
  findPasswordReset,
  incrementTokenVersion,
  markPasswordResetUsed,
  recordFailedLogin,
  resetLoginFailures,
  revokeRefreshToken,
  revokeRefreshTokensForUser,
  storeRefreshToken,
  updatePassword,
} from "./auth.repo";
import {
  getAccessTokenExpiresIn,
  getAccessTokenSecret,
  getLoginTimeoutMs,
  getLoginLockoutMinutes,
  getLoginLockoutThreshold,
  getPasswordMaxAgeDays,
  getRefreshTokenExpiresIn,
} from "../../config";
import { AppError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import { pool } from "../../db";
import { cancelDbWork, getDbFailureCategory, isDbConnectionFailure } from "../../dbRuntime";
import { type Role } from "../../auth/roles";
import { logError, logInfo, logWarn } from "../../observability/logger";
import { recordTransactionRollback } from "../../observability/transactionTelemetry";
import { trackEvent } from "../../observability/appInsights";
import { buildTelemetryProperties } from "../../observability/telemetry";

type AccessTokenPayload = {
  userId: string;
  role: Role;
  tokenVersion: number;
};

type RefreshTokenPayload = AccessTokenPayload & {
  tokenId: string;
};

const refreshLocks = new Set<string>();

async function withRefreshLock<T>(
  userId: string,
  operation: () => Promise<T>
): Promise<T> {
  if (refreshLocks.has(userId)) {
    throw new AppError("invalid_token", "Invalid refresh token.", 401);
  }
  refreshLocks.add(userId);
  try {
    return await operation();
  } finally {
    refreshLocks.delete(userId);
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function timingSafeTokenCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

function isPasswordExpired(passwordChangedAt?: Date | null): boolean {
  if (!passwordChangedAt) {
    return false;
  }
  const maxAgeDays = getPasswordMaxAgeDays();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  return passwordChangedAt.getTime() < Date.now() - maxAgeMs;
}

function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

type AuthDbAction = "login" | "refresh" | "logout_all";

function trackAuthEvent(
  name: string,
  properties?: Record<string, unknown>
): void {
  trackEvent({ name, properties: buildTelemetryProperties(properties) });
}

function trackAuthDbFailure(action: AuthDbAction, error: unknown): void {
  const category = getDbFailureCategory(error);
  const name =
    category === "pool_exhausted"
      ? "auth_pool_exhausted"
      : "auth_db_unavailable";
  trackAuthEvent(name, { action, category: category ?? "unavailable" });
}

async function withAuthDbRetry<T>(
  action: AuthDbAction,
  operation: () => Promise<T>
): Promise<T> {
  let retryAttempted = false;
  while (true) {
    try {
      const result = await operation();
      if (retryAttempted) {
        trackAuthEvent("auth_db_retry_succeeded", { action });
      }
      return result;
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      if (isDbConnectionFailure(err)) {
        const category = getDbFailureCategory(err);
        if (category === "pool_exhausted") {
          trackAuthDbFailure(action, err);
          throw new AppError(
            "service_unavailable",
            "Authentication service unavailable.",
            503
          );
        }
        if (!retryAttempted) {
          retryAttempted = true;
          trackAuthEvent("auth_db_retry_attempt", { action });
          continue;
        }
        trackAuthEvent("auth_db_retry_failed", { action });
        trackAuthDbFailure(action, err);
        throw new AppError(
          "service_unavailable",
          "Authentication service unavailable.",
          503
        );
      }
      trackAuthEvent("auth_unexpected_error", { action });
      throw new AppError(
        "service_unavailable",
        "Authentication service unavailable.",
        503
      );
    }
  }
}

const bcryptHashPattern = /^\$2[aby]\$(\d{2})\$[./A-Za-z0-9]{53}$/;
const argon2HashPattern = /^\$argon2(id|i|d)\$[^\s]+$/;
const CURRENT_BCRYPT_COST = 12;

type PasswordHashEvaluation =
  | { status: "missing" }
  | { status: "bcrypt"; cost: number; needsRehash: boolean }
  | { status: "argon2" }
  | { status: "invalid" };

function evaluatePasswordHash(hash?: string | null): PasswordHashEvaluation {
  const trimmed = typeof hash === "string" ? hash.trim() : "";
  if (!trimmed) {
    return { status: "missing" };
  }
  const bcryptMatch = bcryptHashPattern.exec(trimmed);
  if (bcryptMatch) {
    const cost = Number(bcryptMatch[1]);
    const boundedCost = Number.isFinite(cost) ? cost : 0;
    const validCost = boundedCost >= 4 && boundedCost <= 31;
    if (!validCost) {
      return { status: "invalid" };
    }
    return {
      status: "bcrypt",
      cost: boundedCost,
      needsRehash: boundedCost !== CURRENT_BCRYPT_COST,
    };
  }
  if (argon2HashPattern.test(trimmed)) {
    return { status: "argon2" };
  }
  return { status: "invalid" };
}

async function handleRefreshReuse(
  userId: string,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await revokeRefreshTokensForUser(userId);
  await incrementTokenVersion(userId);
  await recordAuditEvent({
    action: "token_revoke",
    actorUserId: userId,
    targetUserId: userId,
    ip,
    userAgent,
    success: true,
  });
  await recordAuditEvent({
    action: "token_reuse",
    actorUserId: userId,
    targetUserId: userId,
    ip,
    userAgent,
    success: false,
  });
}

function issueAccessToken(payload: AccessTokenPayload): string {
  const secret = getAccessTokenSecret();
  if (!secret) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 503);
  }
  const options: SignOptions = {
    expiresIn: getAccessTokenExpiresIn() as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, secret, options);
}

function issueRefreshToken(payload: AccessTokenPayload): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 503);
  }
  const options: SignOptions = {
    expiresIn: getRefreshTokenExpiresIn() as SignOptions["expiresIn"],
  };
  const refreshPayload: RefreshTokenPayload = {
    ...payload,
    tokenId: randomBytes(16).toString("hex"),
  };
  return jwt.sign(refreshPayload, secret, options);
}

export function assertAuthSubsystem(): void {
  const accessSecret = getAccessTokenSecret();
  const refreshSecret = process.env.JWT_REFRESH_SECRET;
  if (!accessSecret || !refreshSecret) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 503);
  }
  if (accessSecret === refreshSecret) {
    throw new AppError(
      "auth_misconfigured",
      "Auth secrets must be distinct.",
      503
    );
  }
}

export async function loginUser(
  email: string,
  password: string,
  ip?: string,
  userAgent?: string
): Promise<{
  accessToken: string;
  code?: string;
  message?: string;
}> {
  const normalizedEmail = normalizeEmail(email);
  const trimmedPassword = typeof password === "string" ? password.trim() : "";
  if (!normalizedEmail || trimmedPassword.length === 0) {
    throw new AppError(
      "missing_credentials",
      "Email and password are required.",
      400
    );
  }

  const attemptLogin = async (): Promise<{ accessToken: string }> => {
    const client = await pool.connect();
    const loginTimeoutMs = getLoginTimeoutMs();
    let timeoutId: NodeJS.Timeout | null = null;
    let completed = false;

    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(async () => {
        if (completed) {
          return;
        }
        const processId = (client as { processID?: number }).processID;
        if (processId) {
          try {
            await cancelDbWork([processId]);
          } catch {
            // ignore cancel failures
          }
        }
        logWarn("auth_login_timeout", { email: normalizedEmail, durationMs: loginTimeoutMs });
        reject(
          new AppError(
            "auth_unavailable",
            "Authentication service unavailable.",
            503
          )
        );
      }, loginTimeoutMs);
    });

    const loginPromise = (async (): Promise<{
      accessToken: string;
      code?: string;
      message?: string;
    }> => {
      let committed = false;
      let legacyHashUpgraded = false;
      try {
        await client.query("begin");
        logInfo("auth_login_received", { email: normalizedEmail });
        const user = await findAuthUserByEmail(normalizedEmail, client, { forUpdate: true });
        logInfo("auth_login_user_lookup", {
          email: normalizedEmail,
          userExists: Boolean(user),
        });

        if (!user || !user.role || !user.email) {
          logWarn("auth_login_failed", {
            email: normalizedEmail,
            reason: "user_not_found",
          });
          await recordAuditEvent({
            action: "login",
            actorUserId: user?.id ?? null,
            targetUserId: user?.id ?? null,
            ip,
            userAgent,
            success: false,
            client,
          });
          await client.query("commit");
          committed = true;
          trackAuthEvent("auth_invalid_credentials", {
            action: "login",
            reason: "user_not_found",
          });
          throw new AppError(
            "invalid_credentials",
            "Invalid credentials.",
            401
          );
        }

        const passwordHash = user.passwordHash;
        const passwordHashState = evaluatePasswordHash(passwordHash);
        const trimmedPasswordHash =
          typeof passwordHash === "string" ? passwordHash.trim() : "";
        if (passwordHashState.status === "missing") {
          const reason = "password_hash_missing";
          logError("invalid_password_state", {
            email: normalizedEmail,
            userId: user.id,
            reason,
          });
          logWarn("auth_login_failed", {
            email: normalizedEmail,
            userId: user.id,
            reason: "reset_required",
          });
          await recordAuditEvent({
            action: "invalid_password_state",
            actorUserId: user.id,
            targetUserId: user.id,
            ip,
            userAgent,
            success: false,
            metadata: { reason },
            client,
          });
          await client.query("commit");
          committed = true;
          trackAuthEvent("auth_password_hash_invalid", {
            action: "login",
            reason,
          });
          throw new AppError(
            "password_reset_required",
            "Password reset required.",
            403
          );
        }

        if (passwordHashState.status === "invalid") {
          const reason = "password_hash_invalid_format";
          logError("invalid_password_state", {
            email: normalizedEmail,
            userId: user.id,
            reason,
          });
          await recordAuditEvent({
            action: "invalid_password_state",
            actorUserId: user.id,
            targetUserId: user.id,
            ip,
            userAgent,
            success: false,
            metadata: { reason },
            client,
          });
          await client.query("commit");
          committed = true;
          trackAuthEvent("auth_password_hash_invalid", {
            action: "login",
            reason,
          });
          throw new AppError(
            "invalid_password_hash",
            "Invalid password hash.",
            403
          );
        }

        if (passwordHashState.status === "argon2") {
          const reason = "password_hash_legacy_format";
          logWarn("legacy_password_state", {
            email: normalizedEmail,
            userId: user.id,
            reason,
          });
          logWarn("auth_login_failed", {
            email: normalizedEmail,
            userId: user.id,
            reason: "legacy_hash_detected",
          });
          await recordAuditEvent({
            action: "invalid_password_state",
            actorUserId: user.id,
            targetUserId: user.id,
            ip,
            userAgent,
            success: false,
            metadata: { reason },
            client,
          });
          await client.query("commit");
          committed = true;
          trackAuthEvent("auth_password_hash_legacy", {
            action: "login",
            reason,
          });
          throw new AppError(
            "password_reset_required",
            "Password reset required.",
            403
          );
        }

        logInfo("auth_login_password_hash", {
          email: normalizedEmail,
          userId: user.id,
          algorithm: "bcrypt",
          cost: passwordHashState.cost,
          legacy: passwordHashState.needsRehash,
        });

        const now = Date.now();
        const isLocked = Boolean(
          user.lockedUntil && user.lockedUntil.getTime() > now
        );
        logInfo("auth_login_flags", {
          email: normalizedEmail,
          userId: user.id,
          disabled: !user.active,
          locked: isLocked,
        });

        if (!user.active) {
          logWarn("auth_login_failed", {
            email: normalizedEmail,
            userId: user.id,
            reason: "account_disabled",
          });
          await recordAuditEvent({
            action: "login",
            actorUserId: user.id,
            targetUserId: user.id,
            ip,
            userAgent,
            success: false,
            client,
          });
          await client.query("commit");
          committed = true;
          throw new AppError("account_disabled", "Account is disabled.", 403);
        }

        if (isLocked) {
          logWarn("auth_login_failed", {
            email: normalizedEmail,
            userId: user.id,
            reason: "account_locked",
          });
          await recordAuditEvent({
            action: "login",
            actorUserId: user.id,
            targetUserId: user.id,
            ip,
            userAgent,
            success: false,
            client,
          });
          await client.query("commit");
          committed = true;
          throw new AppError(
            "account_locked",
            "Account is locked. Try again later.",
            423
          );
        }

        trackAuthEvent("auth_determinism_check_passed", {
          action: "login",
          userId: user.id,
        });

        const ok = await bcrypt.compare(password, trimmedPasswordHash);
        logInfo("auth_login_password_check", {
          email: normalizedEmail,
          userId: user.id,
          algorithm: "bcrypt",
          match: ok,
        });

        if (!ok) {
          const lockoutThreshold = getLoginLockoutThreshold();
          const lockoutMinutes = getLoginLockoutMinutes();
          const nextFailures = user.failedLoginAttempts + 1;
          const shouldLock = nextFailures >= lockoutThreshold;
          const lockUntil = shouldLock
            ? new Date(Date.now() + lockoutMinutes * 60 * 1000)
            : null;
          await recordFailedLogin(user.id, lockUntil, client);
          if (shouldLock) {
            await recordAuditEvent({
              action: "account_lockout",
              actorUserId: user.id,
              targetUserId: user.id,
              ip,
              userAgent,
              success: true,
              client,
            });
          }
          await recordAuditEvent({
            action: "login",
            actorUserId: user.id,
            targetUserId: user.id,
            ip,
            userAgent,
            success: false,
            client,
          });
          await client.query("commit");
          committed = true;
          trackAuthEvent("auth_invalid_credentials", {
            action: "login",
            reason: "password_mismatch",
          });
          logWarn("auth_login_failed", {
            email: normalizedEmail,
            userId: user.id,
            reason: "password_mismatch",
          });
          throw new AppError(
            "invalid_credentials",
            "Invalid credentials.",
            401
          );
        }

        await resetLoginFailures(user.id, client);

        if (isPasswordExpired(user.passwordChangedAt)) {
          logWarn("auth_login_failed", {
            email: normalizedEmail,
            userId: user.id,
            reason: "password_expired",
          });
          await recordAuditEvent({
            action: "login",
            actorUserId: user.id,
            targetUserId: user.id,
            ip,
            userAgent,
            success: false,
            client,
          });
          await client.query("commit");
          committed = true;
          throw new AppError(
            "password_expired",
            "Password has expired. Reset your password.",
            403
          );
        }

        if (passwordHashState.needsRehash) {
          const upgradedHash = await bcrypt.hash(password, CURRENT_BCRYPT_COST);
          await updatePassword(user.id, upgradedHash, client);
          legacyHashUpgraded = true;
          logInfo("auth_password_hash_upgraded", {
            userId: user.id,
            email: normalizedEmail,
            previousCost: passwordHashState.cost,
            newCost: CURRENT_BCRYPT_COST,
          });
        }

        const payload = {
          userId: user.id,
          role: user.role,
          tokenVersion: user.tokenVersion,
        };
        const accessToken = issueAccessToken(payload);
        const refreshToken = issueRefreshToken(payload);
        const tokenHash = hashToken(refreshToken);

        const refreshExpires = new Date();
        refreshExpires.setSeconds(
          refreshExpires.getSeconds() + msToSeconds(getRefreshTokenExpiresIn())
        );

        await revokeRefreshTokensForUser(user.id, client);
        await recordAuditEvent({
          action: "token_revoke",
          actorUserId: user.id,
          targetUserId: user.id,
          ip,
          userAgent,
          success: true,
          client,
        });
        await storeRefreshToken({
          userId: user.id,
          tokenHash,
          expiresAt: refreshExpires,
          client,
        });

        await recordAuditEvent({
          action: "login",
          actorUserId: user.id,
          targetUserId: user.id,
          ip,
          userAgent,
          success: true,
          client,
        });
        logInfo("auth_login_succeeded", {
          userId: user.id,
          email: user.email,
        });

        await client.query("commit");
        committed = true;
        if (legacyHashUpgraded) {
          return {
            accessToken,
            code: "legacy_hash_upgraded",
            message: "Legacy password hash upgraded.",
          };
        }
        return { accessToken };
      } catch (err) {
        if (!committed) {
          try {
            await client.query("rollback");
          } catch {
            // ignore rollback errors
          }
        }
        throw err;
      } finally {
        completed = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        client.release();
      }
    })();

    loginPromise.catch(() => {});
    return Promise.race([loginPromise, timeoutPromise]);
  };
  try {
    return await withAuthDbRetry("login", attemptLogin);
  } catch (err) {
    if (err instanceof AppError && err.code === "service_unavailable") {
      try {
        await recordAuditEvent({
          action: "login",
          actorUserId: null,
          targetUserId: null,
          ip,
          userAgent,
          success: false,
          metadata: { reason: "db_unavailable" },
        });
      } catch {
        // ignore audit failures when auth is unavailable
      }
    }
    throw err;
  }
}

export async function refreshSession(
  refreshToken: string,
  ip?: string,
  userAgent?: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 503);
  }

  const decoded = jwt.decode(refreshToken) as RefreshTokenPayload | null;
  const actorUserId = decoded?.userId ?? null;

  return withAuthDbRetry("refresh", async () => {
    try {
      const payload = jwt.verify(refreshToken, secret) as RefreshTokenPayload;
      if (
        !payload.userId ||
        !payload.role ||
        typeof payload.tokenVersion !== "number" ||
        !payload.tokenId
      ) {
        throw new AppError("invalid_token", "Invalid refresh token.", 401);
      }

      return await withRefreshLock(payload.userId, async () => {
        const client = await pool.connect();
        try {
          await client.query("begin");
          const tokenHash = hashToken(refreshToken);
          const record = await consumeRefreshToken(tokenHash, client);
          if (!record) {
            await client.query("rollback");
            await handleRefreshReuse(payload.userId, ip, userAgent);
            throw new AppError("invalid_token", "Invalid refresh token.", 401);
          }
          if (record.userId !== payload.userId) {
            await client.query("commit");
            await handleRefreshReuse(payload.userId, ip, userAgent);
            throw new AppError("invalid_token", "Invalid refresh token.", 401);
          }
          if (record.expiresAt.getTime() < Date.now()) {
            await client.query("commit");
            throw new AppError("invalid_token", "Invalid refresh token.", 401);
          }

          const user = await findAuthUserById(payload.userId, client);
          if (!user || !user.active) {
            await client.query("commit");
            throw new AppError("invalid_token", "Invalid refresh token.", 401);
          }
          if (isPasswordExpired(user.passwordChangedAt)) {
            await client.query("commit");
            throw new AppError(
              "password_expired",
              "Password has expired. Reset your password.",
              403
            );
          }
          if (user.tokenVersion !== payload.tokenVersion) {
            await client.query("commit");
            throw new AppError("invalid_token", "Invalid refresh token.", 401);
          }

          const newAccessToken = issueAccessToken({
            userId: user.id,
            role: user.role,
            tokenVersion: user.tokenVersion,
          });
          const newRefreshToken = issueRefreshToken({
            userId: user.id,
            role: user.role,
            tokenVersion: user.tokenVersion,
          });
          const newHash = hashToken(newRefreshToken);
          const refreshExpires = new Date();
          refreshExpires.setSeconds(
            refreshExpires.getSeconds() + msToSeconds(getRefreshTokenExpiresIn())
          );

          await storeRefreshToken({
            userId: user.id,
            tokenHash: newHash,
            expiresAt: refreshExpires,
            client,
          });

          await recordAuditEvent({
            action: "token_refresh",
            actorUserId: user.id,
            targetUserId: user.id,
            ip,
            userAgent,
            success: true,
            client,
          });
          logInfo("auth_refresh_succeeded", { userId: user.id });
          await client.query("commit");

          return { accessToken: newAccessToken, refreshToken: newRefreshToken };
        } catch (err) {
          try {
            await client.query("rollback");
          } catch {
            // ignore rollback errors
          }
          throw err;
        } finally {
          client.release();
        }
      });
    } catch (err) {
      await recordAuditEvent({
        action: "token_refresh",
        actorUserId,
        targetUserId: actorUserId,
        ip,
        userAgent,
        success: false,
      });
      logWarn("auth_refresh_failed", {
        userId: actorUserId,
        error: err instanceof Error ? err.message : "unknown_error",
      });
      if (err instanceof AppError) {
        if (err.code === "invalid_token") {
          trackAuthEvent("auth_invalid_token", { action: "refresh" });
        }
        throw err;
      }
      throw err;
    }
  });
}

export async function logoutUser(params: {
  userId: string;
  refreshToken: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const tokenHash = hashToken(params.refreshToken);
  await revokeRefreshToken(tokenHash);
  await recordAuditEvent({
    action: "token_revoke",
    actorUserId: params.userId,
    targetUserId: params.userId,
    ip: params.ip,
    userAgent: params.userAgent,
    success: true,
  });
  await recordAuditEvent({
    action: "logout",
    actorUserId: params.userId,
    targetUserId: params.userId,
    ip: params.ip,
    userAgent: params.userAgent,
    success: true,
  });
}

export async function logoutAll(params: {
  userId: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await withAuthDbRetry("logout_all", async () => {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await incrementTokenVersion(params.userId, client);
      await revokeRefreshTokensForUser(params.userId, client);
      await recordAuditEvent({
        action: "token_revoke",
        actorUserId: params.userId,
        targetUserId: params.userId,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
        client,
      });
      await recordAuditEvent({
        action: "logout_all",
        actorUserId: params.userId,
        targetUserId: params.userId,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
        client,
      });
      await client.query("commit");
    } catch (err) {
      try {
        await client.query("rollback");
      } catch {
        // ignore rollback errors
      }
      throw err;
    } finally {
      client.release();
    }
  });
}

export async function createUserAccount(params: {
  email: string;
  password: string;
  role: Role;
  actorUserId?: string | null;
  ip?: string;
  userAgent?: string;
}): Promise<{ id: string; email: string; role: Role }> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const passwordHash = await bcrypt.hash(params.password, CURRENT_BCRYPT_COST);
    const user = await createUser({
      email: params.email,
      passwordHash,
      role: params.role,
      client,
    });
    await recordAuditEvent({
      action: "user_created",
      actorUserId: params.actorUserId ?? null,
      targetUserId: user.id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client,
    });
    await client.query("commit");
    return { id: user.id, email: user.email, role: user.role };
  } catch (err) {
    recordTransactionRollback(err);
    await client.query("rollback");
    await recordAuditEvent({
      action: "user_created",
      actorUserId: params.actorUserId ?? null,
      targetUserId: null,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
    });
    throw err;
  } finally {
    client.release();
  }
}

export async function changePassword(params: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const user = await findAuthUserById(params.userId);
  if (!user || !user.passwordHash) {
    await recordAuditEvent({
      action: "password_change",
      actorUserId: params.userId,
      targetUserId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
    });
    throw new AppError("invalid_credentials", "Invalid credentials.", 401);
  }
  const ok = await bcrypt.compare(params.currentPassword, user.passwordHash);
  if (!ok) {
    await recordAuditEvent({
      action: "password_change",
      actorUserId: params.userId,
      targetUserId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
    });
    throw new AppError("invalid_credentials", "Invalid credentials.", 401);
  }
  const client = await pool.connect();
  try {
    await client.query("begin");
    const passwordHash = await bcrypt.hash(params.newPassword, CURRENT_BCRYPT_COST);
    await updatePassword(params.userId, passwordHash, client);
    await incrementTokenVersion(params.userId, client);
    await revokeRefreshTokensForUser(params.userId, client);
    await recordAuditEvent({
      action: "token_revoke",
      actorUserId: params.userId,
      targetUserId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client,
    });
    await recordAuditEvent({
      action: "password_change",
      actorUserId: params.userId,
      targetUserId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client,
    });
    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    await recordAuditEvent({
      action: "password_change",
      actorUserId: params.userId,
      targetUserId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
    });
    throw err;
  } finally {
    client.release();
  }
}

export async function requestPasswordReset(params: {
  userId: string;
  actorUserId?: string | null;
  ip?: string;
  userAgent?: string;
}): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await createPasswordReset({ userId: params.userId, tokenHash, expiresAt });
  await recordAuditEvent({
    action: "password_reset_requested",
    actorUserId: params.actorUserId ?? null,
    targetUserId: params.userId,
    ip: params.ip,
    userAgent: params.userAgent,
    success: true,
  });
  return token;
}

export async function confirmPasswordReset(params: {
  token: string;
  newPassword: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const tokenHash = hashToken(params.token);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const record = await findPasswordReset(tokenHash, client);
    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      await recordAuditEvent({
        action: "password_reset_completed",
        actorUserId: null,
        targetUserId: record?.userId ?? null,
        ip: params.ip,
        userAgent: params.userAgent,
        success: false,
        client,
      });
      throw new AppError("invalid_token", "Invalid reset token.", 401);
    }

    if (!timingSafeTokenCompare(record.tokenHash, tokenHash)) {
      await recordAuditEvent({
        action: "password_reset_completed",
        actorUserId: null,
        targetUserId: record.userId,
        ip: params.ip,
        userAgent: params.userAgent,
        success: false,
        client,
      });
      throw new AppError("invalid_token", "Invalid reset token.", 401);
    }

    const passwordHash = await bcrypt.hash(params.newPassword, CURRENT_BCRYPT_COST);
    await updatePassword(record.userId, passwordHash, client);
    await incrementTokenVersion(record.userId, client);
    await revokeRefreshTokensForUser(record.userId, client);
    await markPasswordResetUsed(record.id, client);
    await recordAuditEvent({
      action: "token_revoke",
      actorUserId: null,
      targetUserId: record.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client,
    });
    await recordAuditEvent({
      action: "password_reset_completed",
      actorUserId: null,
      targetUserId: record.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client,
    });
    await client.query("commit");
  } catch (err) {
    recordTransactionRollback(err);
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function repairAdminPassword(params: {
  repairToken: string;
  newPassword: string;
  email?: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const configuredToken = process.env.ADMIN_REPAIR_TOKEN;
  if (!configuredToken) {
    throw new AppError(
      "admin_repair_unavailable",
      "Admin repair is not configured.",
      503
    );
  }

  const providedHash = hashToken(params.repairToken);
  const expectedHash = hashToken(configuredToken);
  if (!timingSafeTokenCompare(providedHash, expectedHash)) {
    throw new AppError("invalid_token", "Invalid repair token.", 401);
  }

  const targetEmail = normalizeEmail(
    params.email ?? process.env.ADMIN_REPAIR_EMAIL ?? "todd.w@boreal.financial"
  );
  if (!targetEmail) {
    throw new AppError("missing_fields", "Email is required.", 400);
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const user = await findAuthUserByEmail(targetEmail, client, { forUpdate: true });
    if (!user) {
      await recordAuditEvent({
        action: "admin_password_repair",
        actorUserId: null,
        targetUserId: null,
        ip: params.ip,
        userAgent: params.userAgent,
        success: false,
        metadata: { reason: "user_not_found" },
        client,
      });
      await client.query("commit");
      throw new AppError("not_found", "User not found.", 404);
    }

    const existing = await findPasswordReset(providedHash, client);
    if (existing && existing.userId !== user.id) {
      await client.query("commit");
      throw new AppError("invalid_token", "Invalid repair token.", 401);
    }
    if (existing?.usedAt) {
      await recordAuditEvent({
        action: "admin_password_repair",
        actorUserId: null,
        targetUserId: user.id,
        ip: params.ip,
        userAgent: params.userAgent,
        success: false,
        metadata: { reason: "token_used" },
        client,
      });
      await client.query("commit");
      throw new AppError(
        "admin_repair_used",
        "Admin repair token already used.",
        410
      );
    }
    if (existing && existing.expiresAt.getTime() < Date.now()) {
      await recordAuditEvent({
        action: "admin_password_repair",
        actorUserId: null,
        targetUserId: user.id,
        ip: params.ip,
        userAgent: params.userAgent,
        success: false,
        metadata: { reason: "token_expired" },
        client,
      });
      await client.query("commit");
      throw new AppError("invalid_token", "Invalid repair token.", 401);
    }

    const passwordHash = await bcrypt.hash(
      params.newPassword,
      CURRENT_BCRYPT_COST
    );
    await updatePassword(user.id, passwordHash, client);
    await resetLoginFailures(user.id, client);
    await incrementTokenVersion(user.id, client);
    await revokeRefreshTokensForUser(user.id, client);
    logInfo("auth_admin_password_repaired", {
      userId: user.id,
      email: user.email,
      cost: CURRENT_BCRYPT_COST,
    });

    let recordId = existing?.id;
    if (!recordId) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const record = await createPasswordReset({
        userId: user.id,
        tokenHash: providedHash,
        expiresAt,
        client,
      });
      recordId = record.id;
    }
    await markPasswordResetUsed(recordId, client);
    await recordAuditEvent({
      action: "admin_password_repair",
      actorUserId: null,
      targetUserId: user.id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client,
    });
    await client.query("commit");
  } catch (err) {
    recordTransactionRollback(err);
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function adminRepairUserPassword(params: {
  userId: string;
  newPassword: string;
  actorUserId: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const user = await findAuthUserById(params.userId, client);
    if (!user) {
      await recordAuditEvent({
        action: "admin_password_repair",
        actorUserId: params.actorUserId,
        targetUserId: params.userId,
        ip: params.ip,
        userAgent: params.userAgent,
        success: false,
        client,
      });
      await client.query("commit");
      throw new AppError("not_found", "User not found.", 404);
    }

    const passwordHash = await bcrypt.hash(
      params.newPassword,
      CURRENT_BCRYPT_COST
    );
    await updatePassword(user.id, passwordHash, client);
    await resetLoginFailures(user.id, client);
    await incrementTokenVersion(user.id, client);
    await revokeRefreshTokensForUser(user.id, client);
    await recordAuditEvent({
      action: "token_revoke",
      actorUserId: params.actorUserId,
      targetUserId: user.id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client,
    });
    await recordAuditEvent({
      action: "admin_password_repair",
      actorUserId: params.actorUserId,
      targetUserId: user.id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client,
    });
    logInfo("auth_admin_password_repaired", {
      userId: user.id,
      email: user.email,
      cost: CURRENT_BCRYPT_COST,
    });
    await client.query("commit");
  } catch (err) {
    recordTransactionRollback(err);
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

export async function unlockUserAccount(params: {
  userId: string;
  actorUserId: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const user = await findAuthUserById(params.userId);
  if (!user) {
    await recordAuditEvent({
      action: "account_unlock",
      actorUserId: params.actorUserId,
      targetUserId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
    });
    throw new AppError("not_found", "User not found.", 404);
  }
  await resetLoginFailures(params.userId);
  await recordAuditEvent({
    action: "account_unlock",
    actorUserId: params.actorUserId,
    targetUserId: params.userId,
    ip: params.ip,
    userAgent: params.userAgent,
    success: true,
  });
}

function msToSeconds(value: string): number {
  if (value.endsWith("ms")) {
    return Math.floor(Number(value.replace("ms", "")) / 1000);
  }
  const unit = value.slice(-1);
  const amount = Number(value.slice(0, -1));
  if (Number.isNaN(amount)) {
    return 0;
  }
  switch (unit) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 60 * 60;
    case "d":
      return amount * 60 * 60 * 24;
    default:
      return amount;
  }
}
