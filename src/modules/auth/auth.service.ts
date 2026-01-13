import jwt, { type SignOptions } from "jsonwebtoken";
import { createHash, randomUUID } from "crypto";
import { type PoolClient } from "pg";
import { twilioClient, VERIFY_SERVICE_SID } from "../../services/twilio";
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

const normalizePhone = (phone: string): string =>
  phone.startsWith("+") ? phone : `+${phone.replace(/\D/g, "")}`;

const isValidE164 = (phone: string): boolean => /^\+\d{10,15}$/.test(phone);

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

function issueRefreshToken(): string {
  return randomUUID();
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

function getPhoneTail(phoneE164: string): string {
  return phoneE164.slice(-2);
}

async function requestTwilioVerificationCheck(
  phoneE164: string,
  code: string
): Promise<{ status?: string; sid?: string }> {
  const result = await twilioClient.verify.v2
    .services(VERIFY_SERVICE_SID)
    .verificationChecks.create({ to: phoneE164, code });
  const verificationSid = (result as { sid?: string }).sid;
  return { status: result.status, sid: verificationSid };
}

type StartOtpResult =
  | { ok: true }
  | { ok: false; status: number; error: string; twilioCode?: number | string };

export async function startOtp(phone: string): Promise<StartOtpResult> {
  try {
    const phoneE164 = normalizePhone(phone?.trim() ?? "");
    if (!isValidE164(phoneE164)) {
      const phoneTail = getPhoneTail(phoneE164);
      logWarn("otp_start_invalid_phone", {
        phoneTail,
        status: "invalid_phone",
      });
      return {
        ok: false,
        status: 400,
        error: "Invalid phone number",
      };
    }
    const phoneTail = getPhoneTail(phoneE164);
    const verification = await twilioClient.verify.v2
      .services(VERIFY_SERVICE_SID)
      .verifications.create({ to: phoneE164, channel: "sms" });
    logInfo("otp_start_success", {
      phoneTail,
      serviceSid: VERIFY_SERVICE_SID,
      verificationSid: verification.sid,
      status: verification.status,
    });
    return { ok: true };
  } catch (err: any) {
    const details = getTwilioErrorDetails(err);
    const phoneE164 = normalizePhone(phone?.trim() ?? "");
    const phoneTail = getPhoneTail(phoneE164);
    logWarn("auth_twilio_verify_failed", {
      action: "otp_start",
      phoneTail,
      serviceSid: VERIFY_SERVICE_SID,
      twilioCode: details.code,
      status: details.status,
      message: details.message,
    });
    return {
      ok: false,
      status: 502,
      error: "Twilio verification failed",
      twilioCode: details.code,
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
}): Promise<
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; status: number; error: string; twilioCode?: number | string }
> {
  const rawPhone = params.phone?.trim() ?? "";
  const code = params.code?.trim() ?? "";
  if (!rawPhone || !code) {
    logWarn("otp_verify_invalid_request", {
      status: "missing_fields",
    });
    return {
      ok: false,
      status: 400,
      error: "Phone and code are required",
    };
  }
  const phoneE164 = normalizePhone(rawPhone);
  if (!isValidE164(phoneE164)) {
    const phoneTail = getPhoneTail(phoneE164);
    logWarn("otp_verify_invalid_phone", {
      phoneTail,
      status: "invalid_phone",
    });
    return {
      ok: false,
      status: 400,
      error: "Invalid phone number",
    };
  }
  const phoneTail = getPhoneTail(phoneE164);
  let status: string | undefined;
  let verificationSid: string | undefined;
  try {
    const check = await requestTwilioVerificationCheck(phoneE164, code);
    status = check.status;
    verificationSid = check.sid;
    logInfo("otp_verify_result", {
      phoneTail,
      serviceSid: VERIFY_SERVICE_SID,
      status,
      verificationSid,
    });
  } catch (err) {
    const details = getTwilioErrorDetails(err);
    logWarn("auth_twilio_verify_failed", {
      action: "otp_verify",
      phoneTail,
      serviceSid: VERIFY_SERVICE_SID,
      twilioCode: details.code,
      status: details.status,
      message: details.message,
    });
    return {
      ok: false,
      status: 502,
      error: "Verification service unavailable",
      twilioCode: details.code,
    };
  }
  if (status !== "approved") {
    return { ok: false, status: 401, error: "Invalid or expired code" };
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
    const refreshToken = issueRefreshToken();
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
    return { ok: true, accessToken, refreshToken };
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
  return withAuthDbRetry("refresh", async () => {
    try {
      return await withRefreshLock(refreshToken, async () => {
        const client = await pool.connect();
        const db = client;
        try {
          await client.query("begin");
          const tokenHash = hashToken(refreshToken);
          const record = await consumeRefreshToken(tokenHash, db);
          if (!record) {
            await client.query("rollback");
            throw new AppError("invalid_token", "Invalid refresh token.", 401);
          }
          if (record.expiresAt.getTime() < Date.now()) {
            await client.query("commit");
            throw new AppError("invalid_token", "Invalid refresh token.", 401);
          }

          const user = await findAuthUserById(record.userId, db);
          if (!user || !user.active) {
            await client.query("commit");
            throw new AppError("invalid_token", "Invalid refresh token.", 401);
          }

          const newAccessToken = issueAccessToken({
            userId: user.id,
            role: user.role,
            tokenVersion: user.tokenVersion,
          });
          const newRefreshToken = issueRefreshToken();
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
        actorUserId: null,
        targetUserId: null,
        ip,
        userAgent,
        success: false,
        client: db,
      });
      logWarn("auth_refresh_failed", {
        userId: null,
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
