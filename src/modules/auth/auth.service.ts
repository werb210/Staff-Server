import jwt, { type SignOptions } from "jsonwebtoken";
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
  updateUserRoleById,
} from "./auth.repo";
import { getAccessTokenExpiresIn, getRefreshTokenExpiresIn } from "../../config";
import { AppError, forbiddenError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import { pool } from "../../db";
import { getDbFailureCategory, isDbConnectionFailure } from "../../dbRuntime";
import { ROLES, type Role, isRole } from "../../auth/roles";
import { logInfo, logWarn } from "../../observability/logger";
import { trackEvent } from "../../observability/appInsights";
import { buildTelemetryProperties } from "../../observability/telemetry";
import { getRequestId } from "../../middleware/requestContext";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import {
  generateRefreshToken,
  hashRefreshToken,
} from "../../auth/tokenUtils";

type AccessTokenPayload = {
  sub: string;
  userId: string;
  role: Role;
  phone: string;
  type: "access";
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

const E164_REGEX = /^\+[1-9]\d{10,14}$/;

function assertE164(phone: unknown): string {
  if (!phone || typeof phone !== "string") {
    throw new Error("Phone number is required");
  }

  const parsed = parsePhoneNumberFromString(phone);
  const normalized = parsed?.format("E.164") ?? phone;
  if (!E164_REGEX.test(normalized)) {
    throw new Error("Phone number must be in E.164 format");
  }

  return normalized;
}

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

function issueAccessToken(
  payload: AccessTokenPayload,
  expiresIn: SignOptions["expiresIn"] = getAccessTokenExpiresIn() as SignOptions["expiresIn"]
): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 503);
  }
  const options: SignOptions = {
    expiresIn,
  };
  return jwt.sign(payload, secret, options);
}

function assertRefreshTokenInputs(params: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  action: string;
}): void {
  if (!params.userId || !params.tokenHash || !params.expiresAt) {
    logWarn("auth_refresh_token_missing_fields", {
      userId: params.userId ?? null,
      action: params.action,
      requestId: getRequestId() ?? "unknown",
    });
    throw new AppError(
      "auth_token_error",
      "Authentication service unavailable.",
      500
    );
  }
}

export function assertAuthSubsystem(): void {
  const accessSecret = process.env.JWT_SECRET;
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

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) {
    return null;
  }
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeBootstrapPhone(
  phone: string | null | undefined
): string | null {
  if (!phone) {
    return null;
  }
  const parsed = parsePhoneNumberFromString(phone);
  const normalized = parsed?.format("E.164") ?? phone;
  return E164_REGEX.test(normalized) ? normalized : null;
}

function isBootstrapAdminUser(params: {
  phoneNumber: string;
  email: string | null;
}): boolean {
  const bootstrapEmail = normalizeEmail(
    process.env.AUTH_BOOTSTRAP_ADMIN_EMAIL
  );
  const bootstrapPhone = normalizeBootstrapPhone(
    process.env.AUTH_BOOTSTRAP_ADMIN_PHONE
  );
  const userEmail = normalizeEmail(params.email);
  return (
    (!!bootstrapEmail && !!userEmail && bootstrapEmail === userEmail) ||
    (!!bootstrapPhone && bootstrapPhone === params.phoneNumber)
  );
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

export async function startOtp(phone: unknown): Promise<StartOtpResult> {
  let phoneE164: string;
  try {
    phoneE164 = assertE164(phone);
  } catch {
    const phoneTail = typeof phone === "string" ? getPhoneTail(phone) : "";
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

  try {
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
  const code = params.code?.trim() ?? "";
  if (!code) {
    logWarn("otp_verify_invalid_request", {
      status: "missing_fields",
    });
    return {
      ok: false,
      status: 400,
      error: "Phone and code are required",
    };
  }
  let phoneE164: string;
  try {
    phoneE164 = assertE164(params.phone);
  } catch {
    const phoneTail =
      typeof params.phone === "string" ? getPhoneTail(params.phone) : "";
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
    const userRecord = await findAuthUserByPhone(phoneE164, db, {
      forUpdate: true,
    });
    if (!userRecord) {
      await client.query("commit");
      throw new AppError("account_disabled", "Account is disabled.", 403);
    }
    const isActive = userRecord.active === true || userRecord.isActive === true;
    const isDisabled = userRecord.disabled === true;
    const isLocked =
      userRecord.lockedUntil && userRecord.lockedUntil.getTime() > Date.now();
    if (isDisabled) {
      await client.query("commit");
      throw new AppError("account_disabled", "Account is disabled.", 403);
    }
    if (isLocked) {
      await client.query("commit");
      throw new AppError("account_disabled", "Account is disabled.", 403);
    }
    if (!isActive) {
      logInfo("otp_verify_inactive_user", {
        userId: userRecord.id,
        phoneTail,
        requestId: getRequestId() ?? "unknown",
      });
    }
    let role = userRecord.role;
    if (!role || !isRole(role)) {
      if (isBootstrapAdminUser(userRecord)) {
        await updateUserRoleById(userRecord.id, ROLES.ADMIN, db);
        role = ROLES.ADMIN;
      } else {
        await client.query("commit");
        throw forbiddenError("User has no assigned role");
      }
    }

    await setPhoneVerified(userRecord.id, true, db);

    const payload = {
      sub: userRecord.id,
      userId: userRecord.id,
      role,
      phone: userRecord.phoneNumber,
      type: "access" as const,
      tokenVersion: userRecord.tokenVersion,
    };
    const accessToken = issueAccessToken(payload, "15m");

    let refreshToken: string;
    let tokenHash: string;
    try {
      refreshToken = generateRefreshToken();
      if (!refreshToken) {
        throw new Error("refresh token generation failed");
      }
      tokenHash = hashRefreshToken(refreshToken);
    } catch (err) {
      logWarn("auth_refresh_token_generation_failed", {
        userId: userRecord.id,
        requestId: getRequestId() ?? "unknown",
        error: err instanceof Error ? err.message : "unknown_error",
      });
      throw err;
    }

    const refreshExpires = new Date();
    refreshExpires.setSeconds(
      refreshExpires.getSeconds() + msToSeconds(getRefreshTokenExpiresIn())
    );
    assertRefreshTokenInputs({
      userId: userRecord.id,
      tokenHash,
      expiresAt: refreshExpires,
      action: "otp_verify",
    });
    await revokeRefreshTokensForUser(userRecord.id, db);
    try {
      await storeRefreshToken({
        userId: userRecord.id,
        token: refreshToken,
        tokenHash,
        expiresAt: refreshExpires,
        client: db,
      });
    } catch (err) {
      logWarn("auth_refresh_token_persist_failed", {
        userId: userRecord.id,
        requestId: getRequestId() ?? "unknown",
        error: err instanceof Error ? err.message : "unknown_error",
      });
      throw err;
    }
    logInfo("auth_refresh_token_issued", {
      userId: userRecord.id,
      expiresAt: refreshExpires.toISOString(),
      requestId: getRequestId() ?? "unknown",
    });
    await recordAuditEvent({
      action: "login",
      actorUserId: userRecord.id,
      targetUserId: userRecord.id,
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
          const tokenHash = hashRefreshToken(refreshToken);
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
          const role = user.role;
          if (!role || !isRole(role)) {
            await client.query("commit");
            throw forbiddenError("User has no assigned role");
          }

          const newAccessToken = issueAccessToken({
            sub: user.id,
            userId: user.id,
            role,
            phone: user.phoneNumber,
            type: "access",
            tokenVersion: user.tokenVersion,
          });
          const newRefreshToken = generateRefreshToken();
          if (!newRefreshToken) {
            throw new Error("refresh token generation failed");
          }
          const newHash = hashRefreshToken(newRefreshToken);
          const refreshExpires = new Date();
          refreshExpires.setSeconds(
            refreshExpires.getSeconds() + msToSeconds(getRefreshTokenExpiresIn())
          );

          assertRefreshTokenInputs({
            userId: user.id,
            tokenHash: newHash,
            expiresAt: refreshExpires,
            action: "refresh",
          });
          await storeRefreshToken({
            userId: user.id,
            token: newRefreshToken,
            tokenHash: newHash,
            expiresAt: refreshExpires,
            client: db,
          });
          logInfo("auth_refresh_token_issued", {
            userId: user.id,
            expiresAt: refreshExpires.toISOString(),
            requestId: getRequestId() ?? "unknown",
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
  const tokenHash = hashRefreshToken(params.refreshToken);
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
    return { id: user.id, email: user.email, role: params.role };
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
