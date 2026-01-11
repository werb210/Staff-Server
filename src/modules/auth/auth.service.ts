import jwt, { type SignOptions } from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import { type PoolClient } from "pg";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { Twilio } from "twilio";
import RestException from "twilio/lib/base/RestException";
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
import { logError, logInfo, logWarn } from "../../observability/logger";
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

function normalizePhoneToE164(phone: string): string {
  const parsed =
    parsePhoneNumberFromString(phone) ?? parsePhoneNumberFromString(phone, "US");
  if (!parsed || !parsed.isValid() || !parsed.number.startsWith("+")) {
    throw new AppError("invalid_phone", "invalid phone number", 400);
  }
  return parsed.number;
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

type TwilioVerifyConfig = {
  accountSid: string;
  authToken: string;
  serviceSid: string;
};

let twilioClient: Twilio | null = null;

function getTwilioVerifyConfig(): TwilioVerifyConfig {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!accountSid || !authToken || !serviceSid) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 503);
  }
  return { accountSid, authToken, serviceSid };
}

export function assertTwilioVerifyEnv(): void {
  const missing = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_VERIFY_SERVICE_SID",
  ].filter((key) => !process.env[key] || process.env[key]?.trim().length === 0);
  if (missing.length > 0) {
    logError("twilio_verify_env_missing", { missing });
    throw new Error(`Missing Twilio configuration: ${missing.join(", ")}`);
  }
}

function getTwilioClient(config: TwilioVerifyConfig): Twilio {
  if (!twilioClient) {
    twilioClient = new Twilio(config.accountSid, config.authToken);
  }
  return twilioClient;
}

function isTwilioAuthFailure(error: {
  status?: number;
  code?: number | string;
}): boolean {
  if (error.status === 401) {
    return true;
  }
  const code =
    typeof error.code === "number"
      ? error.code
      : Number.isNaN(Number(error.code))
        ? undefined
        : Number(error.code);
  return code === 20003;
}

function resolveTwilioErrorDetails(error: unknown): {
  message: string;
  status?: number;
  code?: number;
} {
  if (error instanceof RestException) {
    return {
      message: error.message,
      status: error.status,
      code: error.code,
    };
  }
  if (error instanceof Error) {
    return { message: error.message };
  }
  return { message: "Twilio request failed." };
}

function buildTwilioErrorMessage(details: {
  message: string;
  code?: number;
}): string {
  if (details.code) {
    return `Twilio error ${details.code}: ${details.message}`;
  }
  return `Twilio error: ${details.message}`;
}

async function requestTwilioVerification(
  phoneE164: string,
  channel: "sms"
): Promise<void> {
  const config = getTwilioVerifyConfig();
  const client = getTwilioClient(config);
  await client.verify.v2
    .services(config.serviceSid)
    .verifications.create({ to: phoneE164, channel });
}

async function requestTwilioVerificationCheck(
  phoneE164: string,
  code: string
): Promise<string | undefined> {
  const config = getTwilioVerifyConfig();
  const client = getTwilioClient(config);
  const result = await client.verify.v2
    .services(config.serviceSid)
    .verificationChecks.create({ to: phoneE164, code });
  return result.status;
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

export async function startOtpVerification(params: {
  phone: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  const rawPhone = params.phone?.trim() ?? "";
  if (!rawPhone) {
    throw new AppError("missing_fields", "phone is required", 400);
  }
  const phoneE164 = normalizePhoneToE164(rawPhone);
  logInfo("otp_start_request", {
    phone: phoneE164,
    ip: params.ip,
    userAgent: params.userAgent,
  });
  try {
    await requestTwilioVerification(phoneE164, "sms");
    logInfo("otp_start_success", { phone: phoneE164 });
  } catch (err) {
    const details = resolveTwilioErrorDetails(err);
    const isAuthFailure = isTwilioAuthFailure({
      status: details.status,
      code: details.code,
    });
    logWarn("auth_twilio_verify_failed", {
      action: "otp_start",
      phone: phoneE164,
      status: details.status,
      code: details.code,
      message: details.message,
    });
    throw new AppError(
      isAuthFailure ? "twilio_auth_failed" : "twilio_error",
      buildTwilioErrorMessage(details),
      isAuthFailure ? 401 : 500
    );
  }
}

export async function verifyOtpCode(params: {
  phone: string;
  code: string;
  ip?: string;
  userAgent?: string;
}): Promise<{ accessToken: string }> {
  const rawPhone = params.phone?.trim() ?? "";
  const code = params.code?.trim() ?? "";
  if (!rawPhone || !code) {
    throw new AppError("missing_fields", "phone and code are required.", 400);
  }
  const phoneE164 = normalizePhoneToE164(rawPhone);

  let status: string | undefined;
  try {
    status = await requestTwilioVerificationCheck(phoneE164, code);
  } catch (err) {
    const details = resolveTwilioErrorDetails(err);
    const isAuthFailure = isTwilioAuthFailure({
      status: details.status,
      code: details.code,
    });
    logWarn("auth_twilio_verify_failed", {
      action: "otp_verify",
      phone: phoneE164,
      status: details.status,
      code: details.code,
      message: details.message,
    });
    throw new AppError(
      isAuthFailure ? "twilio_auth_failed" : "twilio_error",
      buildTwilioErrorMessage(details),
      isAuthFailure ? 401 : 500
    );
  }
  if (status !== "approved") {
    throw new AppError("otp_failed", "OTP verification failed.", 400);
  }

  return withAuthDbRetry("otp_verify", async () => {
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
      return { accessToken };
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  });
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
