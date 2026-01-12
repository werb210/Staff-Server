import jwt, { type SignOptions } from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import { type PoolClient } from "pg";
import { getTwilioClient } from "../../config/twilio";
import {
  createUser,
  consumeRefreshToken,
  findAuthUserByPhone,
  findAuthUserById,
  incrementTokenVersion,
  revokeRefreshToken,
  revokeRefreshTokensForUser,
  setPhoneVerified,
  storeRefreshToken,
} from "./auth.repo";
import {
  getAccessTokenExpiresIn,
  getAccessTokenSecret,
  getRefreshTokenExpiresIn,
} from "../../config";
import { AppError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import { pool } from "../../db";
import { getDbFailureCategory, isDbConnectionFailure } from "../../dbRuntime";
import { type Role, ROLES } from "../../auth/roles";
import { logInfo, logWarn } from "../../observability/logger";
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

const normalizePhone = (p: string) =>
  p.startsWith("+") ? p : `+${p.replace(/\D/g, "")}`;

type AuthDbAction = "otp_verify" | "refresh" | "logout_all";

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

type Queryable = Pick<PoolClient, "query">;

async function handleRefreshReuse(
  userId: string,
  db: Queryable,
  ip?: string,
  userAgent?: string
): Promise<void> {
  await revokeRefreshTokensForUser(userId, db);
  await incrementTokenVersion(userId, db);
  await recordAuditEvent({
    action: "token_revoke",
    actorUserId: userId,
    targetUserId: userId,
    ip,
    userAgent,
    success: true,
    client: db,
  });
  await recordAuditEvent({
    action: "token_reuse",
    actorUserId: userId,
    targetUserId: userId,
    ip,
    userAgent,
    success: false,
    client: db,
  });
}

function issueAccessToken(payload: AccessTokenPayload): string {
  const secret = getAccessTokenSecret();
  if (!secret) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 503);
  }
  const options: SignOptions = {
    expiresIn: getAccessTokenExpiresIn() as SignOptions["expiresIn"],
    subject: payload.userId,
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
    subject: payload.userId,
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

type TwilioErrorDetails = {
  code?: number | string;
  status?: number;
  message: string;
};

function getTwilioVerifyServiceSid(): string {
  const serviceSid = (process.env.TWILIO_VERIFY_SERVICE_SID ?? "").trim();
  if (!serviceSid || !serviceSid.startsWith("VA")) {
    throw Object.assign(new Error("OTP service unavailable"), { status: 503 });
  }
  return serviceSid;
}

function getTwilioErrorDetails(error: unknown): TwilioErrorDetails {
  if (error && typeof error === "object") {
    const err = error as {
      code?: unknown;
      status?: unknown;
      message?: unknown;
    };
    return {
      code:
        typeof err.code === "number" || typeof err.code === "string"
          ? err.code
          : undefined,
      status: typeof err.status === "number" ? err.status : undefined,
      message: typeof err.message === "string" ? err.message : "Twilio verification failed",
    };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: "Twilio verification failed" };
}

function maskPhoneNumber(phoneE164: string): string {
  const visibleTail = 2;
  const visibleHead = 3;
  if (phoneE164.length <= visibleHead + visibleTail) {
    return "*".repeat(phoneE164.length);
  }
  const head = phoneE164.slice(0, visibleHead);
  const tail = phoneE164.slice(-visibleTail);
  const masked = "*".repeat(phoneE164.length - visibleHead - visibleTail);
  return `${head}${masked}${tail}`;
}

async function requestTwilioVerificationCheck(
  serviceSid: string,
  phoneE164: string,
  code: string
): Promise<string | undefined> {
  const { available, client } = getTwilioClient();
  if (!available || !client) {
    throw Object.assign(new Error("OTP service unavailable"), { status: 503 });
  }
  const result = await client.verify.v2
    .services(serviceSid)
    .verificationChecks.create({ to: phoneE164, code });
  return result.status;
}

type StartOtpResult =
  | { ok: true }
  | { ok: false; status: number; code: string; message: string };

export async function startOtp(phone: string): Promise<StartOtpResult> {
  try {
    const { available, client } = getTwilioClient();
    if (!client || !available) {
      return {
        ok: false,
        status: 503,
        code: "twilio_unavailable",
        message: "Twilio credentials not configured",
      };
    }
    const serviceSid = getTwilioVerifyServiceSid();
    const phoneE164 = normalizePhone(phone?.trim() ?? "");
    const maskedPhone = maskPhoneNumber(phoneE164);
    await client.verify.v2
      .services(serviceSid)
      .verifications.create({ to: phoneE164, channel: "sms" });
    logInfo("otp_start_success", { phone: maskedPhone, serviceSid });
    return { ok: true };
  } catch (err: any) {
    const details = getTwilioErrorDetails(err);
    if (
      err instanceof Error &&
      err.message === "TWILIO_ACCOUNT_SID must be an Account SID (AC...)"
    ) {
      return {
        ok: false,
        status: 401,
        code: "twilio_verify_failed",
        message: "Invalid Twilio credentials",
      };
    }
    const phoneE164 = normalizePhone(phone?.trim() ?? "");
    const maskedPhone = maskPhoneNumber(phoneE164);
    logWarn("auth_twilio_verify_failed", {
      action: "otp_start",
      phone: maskedPhone,
      serviceSid: process.env.TWILIO_VERIFY_SERVICE_SID,
      code: details.code,
      status: details.status,
      message: details.message,
    });
    if (details.code === 20003 || details.status === 401) {
      return {
        ok: false,
        status: 401,
        code: "twilio_verify_failed",
        message: "Invalid Twilio credentials",
      };
    }
    return {
      ok: false,
      status: details.status || 502,
      code: "twilio_verify_failed",
      message: details.message || "Verify failed",
    };
  }
}

async function findOrCreateUserByPhone(
  phoneNumber: string,
  db: Queryable
): Promise<{
  userId: string;
  email: string | null;
  role: Role;
  tokenVersion: number;
}> {
  let user = await findAuthUserByPhone(phoneNumber, db, { forUpdate: true });
  if (!user) {
    const created = await createUser({
      email: null,
      phoneNumber,
      role: ROLES.USER,
      client: db,
    });
    await recordAuditEvent({
      action: "user_created",
      actorUserId: null,
      targetUserId: created.id,
      ip: null,
      userAgent: null,
      success: true,
      client: db,
    });
    user = created;
  }
  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };
}


export async function verifyOtpCode(params: {
  phone: string;
  code: string;
  ip?: string;
  userAgent?: string;
  route?: string;
  method?: string;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const rawPhone = params.phone?.trim() ?? "";
  const code = params.code?.trim() ?? "";
  if (!rawPhone || !code) {
    throw new AppError("validation_error", "Phone and code are required.", 400);
  }
  const phoneE164 = normalizePhone(rawPhone);
  const serviceSid = getTwilioVerifyServiceSid();
  const maskedPhone = maskPhoneNumber(phoneE164);
  logInfo("otp_verify_request", {
    route: params.route,
    method: params.method,
    phone: phoneE164,
    serviceSid,
    ip: params.ip,
    userAgent: params.userAgent,
  });

  let status: string | undefined;
  try {
    status = await requestTwilioVerificationCheck(serviceSid, phoneE164, code);
    logInfo("otp_verify_success", { phone: maskedPhone, serviceSid, status });
  } catch (err) {
    const details = getTwilioErrorDetails(err);
    logWarn("auth_twilio_verify_failed", {
      action: "otp_verify",
      phone: maskedPhone,
      serviceSid,
      code: details.code,
      status: details.status,
      message: details.message,
    });
    throw new AppError(
      "twilio_error",
      "Verification service unavailable.",
      500
    );
  }
  if (status !== "approved") {
    throw new AppError("otp_failed", "OTP verification failed.", 401);
  }

  const client = await pool.connect();
  const db = client;
  try {
    await client.query("begin");
    const user = await findOrCreateUserByPhone(phoneE164, db);
    const userRecord = await findAuthUserById(user.userId, db);
    if (!userRecord || !userRecord.active) {
      await client.query("commit");
      throw new AppError("account_disabled", "Account is disabled.", 403);
    }

    await setPhoneVerified(user.userId, true, db);

    const payload = {
      userId: user.userId,
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
    await revokeRefreshTokensForUser(user.userId, db);
    await storeRefreshToken({
      userId: user.userId,
      tokenHash,
      expiresAt: refreshExpires,
      client: db,
    });
    await recordAuditEvent({
      action: "login",
      actorUserId: user.userId,
      targetUserId: user.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client: db,
    });

    await client.query("commit");
    return { accessToken, refreshToken };
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
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
        const db = client;
        try {
          await client.query("begin");
          const tokenHash = hashToken(refreshToken);
          const record = await consumeRefreshToken(tokenHash, db);
          if (!record) {
            await client.query("rollback");
            await handleRefreshReuse(payload.userId, pool, ip, userAgent);
            throw new AppError("invalid_token", "Invalid refresh token.", 401);
          }
          if (record.userId !== payload.userId) {
            await client.query("commit");
            await handleRefreshReuse(payload.userId, pool, ip, userAgent);
            throw new AppError("invalid_token", "Invalid refresh token.", 401);
          }
          if (record.expiresAt.getTime() < Date.now()) {
            await client.query("commit");
            throw new AppError("invalid_token", "Invalid refresh token.", 401);
          }

          const user = await findAuthUserById(payload.userId, db);
          if (!user || !user.active) {
            await client.query("commit");
            throw new AppError("invalid_token", "Invalid refresh token.", 401);
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
            client: db,
          });

          await recordAuditEvent({
            action: "token_refresh",
            actorUserId: user.id,
            targetUserId: user.id,
            ip,
            userAgent,
            success: true,
            client: db,
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
      const db = pool;
      await recordAuditEvent({
        action: "token_refresh",
        actorUserId,
        targetUserId: actorUserId,
        ip,
        userAgent,
        success: false,
        client: db,
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
  const db = pool;
  await revokeRefreshToken(tokenHash, db);
  await recordAuditEvent({
    action: "token_revoke",
    actorUserId: params.userId,
    targetUserId: params.userId,
    ip: params.ip,
    userAgent: params.userAgent,
    success: true,
    client: db,
  });
  await recordAuditEvent({
    action: "logout",
    actorUserId: params.userId,
    targetUserId: params.userId,
    ip: params.ip,
    userAgent: params.userAgent,
    success: true,
    client: db,
  });
}

export async function logoutAll(params: {
  userId: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await withAuthDbRetry("logout_all", async () => {
    const client = await pool.connect();
    const db = client;
    try {
      await client.query("begin");
      await incrementTokenVersion(params.userId, db);
      await revokeRefreshTokensForUser(params.userId, db);
      await recordAuditEvent({
        action: "token_revoke",
        actorUserId: params.userId,
        targetUserId: params.userId,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
        client: db,
      });
      await recordAuditEvent({
        action: "logout_all",
        actorUserId: params.userId,
        targetUserId: params.userId,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
        client: db,
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
  email?: string | null;
  phoneNumber: string;
  role: Role;
  actorUserId?: string | null;
  ip?: string;
  userAgent?: string;
}): Promise<{ id: string; email: string | null; role: Role }> {
  const client = await pool.connect();
  const db = client;
  try {
    await client.query("begin");
    const user = await createUser({
      email: params.email,
      phoneNumber: params.phoneNumber,
      role: params.role,
      client: db,
    });
    await recordAuditEvent({
      action: "user_created",
      actorUserId: params.actorUserId ?? null,
      targetUserId: user.id,
      ip: params.ip,
      userAgent: params.userAgent,
      success: true,
      client: db,
    });
    await client.query("commit");
    return { id: user.id, email: user.email, role: user.role };
  } catch (err) {
    await client.query("rollback");
    await recordAuditEvent({
      action: "user_created",
      actorUserId: params.actorUserId ?? null,
      targetUserId: null,
      ip: params.ip,
      userAgent: params.userAgent,
      success: false,
      client: db,
    });
    throw err;
  } finally {
    client.release();
  }
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
