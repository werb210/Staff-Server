import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from "jsonwebtoken";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import {
  createPasswordReset,
  createUser,
  consumeRefreshToken,
  findAuthPasswordMetadata,
  findAuthUserByEmailBase,
  findAuthUserById,
  findPasswordReset,
  hasActivePasswordReset,
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
  getLoginLockoutMinutes,
  getLoginLockoutThreshold,
  getPasswordMaxAgeDays,
  getRefreshTokenExpiresIn,
} from "../../config";
import { AppError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import { getDbFailureCategory, isDbConnectionFailure, pool } from "../../db";
import { type Role } from "../../auth/roles";
import { logError, logInfo, logWarn } from "../../observability/logger";
import { recordTransactionRollback } from "../../observability/transactionTelemetry";
import { trackEvent } from "../../observability/appInsights";
import { buildTelemetryProperties } from "../../observability/telemetry";
import { getStartupState } from "../../startupState";

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

function isValidBcryptHash(hash: string): boolean {
  const match = bcryptHashPattern.exec(hash);
  if (!match) {
    return false;
  }
  const cost = Number(match[1]);
  return cost === 12;
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
    if (!getStartupState().dbConnected) {
      throw new AppError(
        "service_unavailable",
        "Authentication service unavailable.",
        503
      );
    }
    logInfo("auth_login_received", { email: normalizedEmail });
    const user = await findAuthUserByEmailBase(normalizedEmail);
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
      });
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

    const passwordMetadata = await findAuthPasswordMetadata(user.id);
    const passwordHash = passwordMetadata?.password_hash;
    const trimmedPasswordHash =
      typeof passwordHash === "string" ? passwordHash.trim() : "";
    if (!trimmedPasswordHash || !isValidBcryptHash(trimmedPasswordHash)) {
      const reason = !trimmedPasswordHash
        ? "password_hash_missing"
        : "password_hash_invalid_format";
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
      });
      trackAuthEvent("invalid_password_state", {
        action: "login",
        reason,
      });
      throw new AppError(
        "invalid_password_state",
        "Invalid password state.",
        500
      );
    }

    logInfo("auth_login_password_hash", {
      email: normalizedEmail,
      userId: user.id,
      algorithm: "bcrypt",
      cost: 12,
    });

    const now = Date.now();
    const isLocked = Boolean(
      user.locked_until && user.locked_until.getTime() > now
    );
    const forceReset = await hasActivePasswordReset(user.id);
    logInfo("auth_login_flags", {
      email: normalizedEmail,
      userId: user.id,
      disabled: !user.active,
      locked: isLocked,
      force_reset: forceReset,
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
      });
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
      });
      throw new AppError(
        "account_locked",
        "Account is locked. Try again later.",
        423
      );
    }

    if (user.locked_until && user.locked_until.getTime() <= now) {
      await resetLoginFailures(user.id);
    }

    if (forceReset) {
      logWarn("auth_login_failed", {
        email: normalizedEmail,
        userId: user.id,
        reason: "password_reset_required",
      });
      await recordAuditEvent({
        action: "login",
        actorUserId: user.id,
        targetUserId: user.id,
        ip,
        userAgent,
        success: false,
      });
      throw new AppError(
        "password_reset_required",
        "Password reset required.",
        403
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
      const nextFailures = user.failed_login_attempts + 1;
      const shouldLock = nextFailures >= lockoutThreshold;
      const lockMultiplier = shouldLock
        ? Math.max(1, Math.ceil(nextFailures / lockoutThreshold))
        : 0;
      const lockUntil = shouldLock
        ? new Date(Date.now() + lockoutMinutes * lockMultiplier * 60 * 1000)
        : null;
      await recordFailedLogin(user.id, lockUntil);
      if (shouldLock) {
        await recordAuditEvent({
          action: "account_lockout",
          actorUserId: user.id,
          targetUserId: user.id,
          ip,
          userAgent,
          success: true,
        });
      }
      await recordAuditEvent({
        action: "login",
        actorUserId: user.id,
        targetUserId: user.id,
        ip,
        userAgent,
        success: false,
      });
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

    await resetLoginFailures(user.id);

    if (isPasswordExpired(passwordMetadata.password_changed_at)) {
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
      });
      throw new AppError(
        "password_expired",
        "Password has expired. Reset your password.",
        403
      );
    }

    const payload = {
      userId: user.id,
      role: user.role,
      tokenVersion: user.token_version,
    };
    const accessToken = issueAccessToken(payload);
    const refreshToken = issueRefreshToken(payload);
    const tokenHash = hashToken(refreshToken);

    const refreshExpires = new Date();
    refreshExpires.setSeconds(
      refreshExpires.getSeconds() + msToSeconds(getRefreshTokenExpiresIn())
    );

    await revokeRefreshTokensForUser(user.id);
    await recordAuditEvent({
      action: "token_revoke",
      actorUserId: user.id,
      targetUserId: user.id,
      ip,
      userAgent,
      success: true,
    });
    await storeRefreshToken({
      userId: user.id,
      tokenHash,
      expiresAt: refreshExpires,
    });

    await recordAuditEvent({
      action: "login",
      actorUserId: user.id,
      targetUserId: user.id,
      ip,
      userAgent,
      success: true,
    });
    logInfo("auth_login_succeeded", {
      userId: user.id,
      email: user.email,
    });

    return { accessToken };
  };
  return withAuthDbRetry("login", attemptLogin);
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
          if (record.user_id !== payload.userId) {
            await client.query("commit");
            await handleRefreshReuse(payload.userId, ip, userAgent);
            throw new AppError("invalid_token", "Invalid refresh token.", 401);
          }
          if (record.expires_at.getTime() < Date.now()) {
            await client.query("commit");
            throw new AppError("invalid_token", "Invalid refresh token.", 401);
          }

          const user = await findAuthUserById(payload.userId, client);
          if (!user || !user.active) {
            await client.query("commit");
            throw new AppError("invalid_token", "Invalid refresh token.", 401);
          }
          if (isPasswordExpired(user.password_changed_at)) {
            await client.query("commit");
            throw new AppError(
              "password_expired",
              "Password has expired. Reset your password.",
              403
            );
          }
          if (user.token_version !== payload.tokenVersion) {
            await client.query("commit");
            throw new AppError("invalid_token", "Invalid refresh token.", 401);
          }

          const newAccessToken = issueAccessToken({
            userId: user.id,
            role: user.role,
            tokenVersion: user.token_version,
          });
          const newRefreshToken = issueRefreshToken({
            userId: user.id,
            role: user.role,
            tokenVersion: user.token_version,
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
    const passwordHash = await bcrypt.hash(params.password, 12);
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
  if (!user || !user.password_hash) {
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
  const ok = await bcrypt.compare(params.currentPassword, user.password_hash);
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
    const passwordHash = await bcrypt.hash(params.newPassword, 12);
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
    if (!record || record.used_at || record.expires_at.getTime() < Date.now()) {
      await recordAuditEvent({
        action: "password_reset_completed",
        actorUserId: null,
        targetUserId: record?.user_id ?? null,
        ip: params.ip,
        userAgent: params.userAgent,
        success: false,
        client,
      });
      throw new AppError("invalid_token", "Invalid reset token.", 401);
    }

    if (!timingSafeTokenCompare(record.token_hash, tokenHash)) {
      await recordAuditEvent({
        action: "password_reset_completed",
        actorUserId: null,
        targetUserId: record.user_id,
        ip: params.ip,
        userAgent: params.userAgent,
        success: false,
        client,
      });
      throw new AppError("invalid_token", "Invalid reset token.", 401);
    }

    const passwordHash = await bcrypt.hash(params.newPassword, 12);
    await updatePassword(record.user_id, passwordHash, client);
    await incrementTokenVersion(record.user_id, client);
    await revokeRefreshTokensForUser(record.user_id, client);
    await markPasswordResetUsed(record.id, client);
    await recordAuditEvent({
      action: "token_revoke",
      actorUserId: null,
      targetUserId: record.user_id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client,
    });
    await recordAuditEvent({
      action: "password_reset_completed",
      actorUserId: null,
      targetUserId: record.user_id,
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
