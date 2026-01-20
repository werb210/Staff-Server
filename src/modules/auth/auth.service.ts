import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";
import {
  getTwilioClient,
  getTwilioVerifyServiceSid,
  sendOtp,
} from "../../services/twilio";
import {
  createUser,
  createOtpVerification,
  findAuthUserByPhone,
  findAuthUserById,
  findApprovedOtpVerificationByPhone,
  setPhoneVerified,
  updateUserRoleById,
  storeRefreshToken,
  consumeRefreshToken,
} from "./auth.repo";
import { AppError, forbiddenError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import { pool } from "../../db";
import { ROLES, type Role, isRole } from "../../auth/roles";
import { logError, logInfo, logWarn } from "../../observability/logger";
import { getRequestId } from "../../middleware/requestContext";
import { normalizePhoneNumber } from "./phone";
import { ensureOtpTableExists } from "../../db/ensureOtpTable";
import {
  getAccessTokenExpiresIn,
  getAccessTokenSecret,
  getRefreshTokenExpiresIn,
  getRefreshTokenExpiresInMs,
  getRefreshTokenSecret,
  getJwtClockSkewSeconds,
} from "../../config";
import { hashRefreshToken } from "../../auth/tokenUtils";

export type AccessTokenPayload = {
  sub: string;
  role: Role;
  tokenVersion: number;
};

type RefreshTokenPayload = JwtPayload & {
  sub?: string;
  tokenVersion?: number;
  type?: string;
  jti?: string;
};

function assertE164(phone: unknown): string {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    throw new Error("Phone number must be in E.164 format");
  }
  return normalized;
}

export function issueAccessToken(payload: AccessTokenPayload): string {
  const secret = getAccessTokenSecret();
  if (!secret) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 503);
  }
  const expiresIn = getAccessTokenExpiresIn() as SignOptions["expiresIn"];
  return jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn,
  });
}

export function issueRefreshToken(params: {
  userId: string;
  tokenVersion: number;
}): { token: string; tokenHash: string; expiresAt: Date } {
  const secret = getRefreshTokenSecret();
  if (!secret) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 503);
  }
  const payload: RefreshTokenPayload = {
    sub: params.userId,
    tokenVersion: params.tokenVersion,
    type: "refresh",
    jti: randomUUID(),
  };
  const expiresIn = getRefreshTokenExpiresIn() as SignOptions["expiresIn"];
  const token = jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn,
  });
  return {
    token,
    tokenHash: hashRefreshToken(token),
    expiresAt: new Date(Date.now() + getRefreshTokenExpiresInMs()),
  };
}

function verifyRefreshToken(token: string): RefreshTokenPayload {
  const secret = getRefreshTokenSecret();
  if (!secret) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 503);
  }
  try {
    return jwt.verify(token, secret, {
      algorithms: ["HS256"],
      clockTolerance: getJwtClockSkewSeconds(),
    }) as RefreshTokenPayload;
  } catch {
    throw new AppError("invalid_refresh_token", "Invalid refresh token.", 401);
  }
}

function resolveRefreshPayload(payload: RefreshTokenPayload): {
  userId: string;
  tokenVersion: number;
} {
  const userId = typeof payload.sub === "string" ? payload.sub : null;
  const tokenVersion =
    typeof payload.tokenVersion === "number" ? payload.tokenVersion : null;
  const type = payload.type;
  if (!userId || tokenVersion === null || type !== "refresh") {
    throw new AppError("invalid_refresh_token", "Invalid refresh token.", 401);
  }
  return { userId, tokenVersion };
}

function resolveAuthRole(role: string | null): Role {
  if (role && isRole(role)) {
    return role;
  }
  throw forbiddenError("User has no assigned role");
}

export function assertUserActive(params: {
  user: {
    id: string;
    active: boolean;
    isActive: boolean | null;
    disabled: boolean | null;
    lockedUntil: Date | null;
  };
  requestId: string;
  phoneTail?: string;
}): void {
  const { user, requestId, phoneTail } = params;
  if (user.disabled === true) {
    throw new AppError("account_disabled", "Account is disabled.", 403);
  }
  if (user.isActive === false) {
    logInfo("otp_verify_inactive_user", {
      userId: user.id,
      phoneTail,
      requestId,
    });
    throw new AppError("user_disabled", "Account is inactive.", 403);
  }
  const isActive = user.active === true || user.isActive === true;
  if (!isActive) {
    logInfo("otp_verify_inactive_user", {
      userId: user.id,
      phoneTail,
      requestId,
    });
    throw new AppError("user_disabled", "Account is inactive.", 403);
  }
  const isLocked = user.lockedUntil && user.lockedUntil.getTime() > Date.now();
  if (isLocked) {
    throw new AppError("locked", "Account is locked.", 403);
  }
}

export function assertAuthSubsystem(): void {
  const accessSecret = getAccessTokenSecret();
  const refreshSecret = getRefreshTokenSecret();
  if (!accessSecret || !refreshSecret) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 503);
  }
}

type TwilioErrorDetails = {
  code?: number | string;
  status?: number;
  message: string;
};

const REQUIRED_TWILIO_ENV = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_VERIFY_SERVICE_SID",
] as const;

const OTP_VERIFICATIONS_MISSING_CODE = "42P01";

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

function getMissingTwilioEnv(): string[] {
  return REQUIRED_TWILIO_ENV.filter(
    (key) => !process.env[key] || process.env[key]?.trim().length === 0
  );
}

function assertTwilioConfig(requestId: string): {
  client: NonNullable<ReturnType<typeof getTwilioClient>>;
  verifyServiceSid: string;
} {
  const missing = getMissingTwilioEnv();
  if (missing.length > 0) {
    logError("twilio_missing_env", { missing, requestId });
    throw new AppError("twilio_unavailable", "Twilio is not configured.", 503);
  }
  const client = getTwilioClient();
  const verifyServiceSid = getTwilioVerifyServiceSid();
  if (!client || !verifyServiceSid) {
    logError("twilio_missing_env", {
      missing,
      requestId,
    });
    throw new AppError("twilio_unavailable", "Twilio is not configured.", 503);
  }
  return { client, verifyServiceSid };
}

function isTwilioAuthError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 20003
  );
}

function isOtpVerificationTableMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const err = error as { code?: unknown; message?: unknown };
  const message = typeof err.message === "string" ? err.message : "";
  if (err.code === OTP_VERIFICATIONS_MISSING_CODE) {
    return message ? message.includes("otp_verifications") : true;
  }
  return message.includes("otp_verifications") && message.includes("exist");
}

function getTwilioFailureCode(status?: number): string {
  if (!status) {
    return "OTP_VERIFY_TWILIO_4XX";
  }
  if (status >= 500) {
    return "OTP_VERIFY_TWILIO_5XX";
  }
  return "OTP_VERIFY_TWILIO_4XX";
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

function resolveOtpStatus(status?: string): "pending" | "approved" | "expired" {
  if (!status) {
    return "expired";
  }
  if (status === "approved") {
    return "approved";
  }
  if (status === "pending") {
    return "pending";
  }
  return "expired";
}

function normalizeBootstrapPhone(
  phone: string | null | undefined
): string | null {
  if (!phone) {
    return null;
  }
  return normalizePhoneNumber(phone);
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
  client: NonNullable<ReturnType<typeof getTwilioClient>>,
  verifyServiceSid: string,
  phoneE164: string,
  code: string
): Promise<{ status?: string; sid?: string }> {
  const result = await client.verify.v2
    .services(verifyServiceSid)
    .verificationChecks.create({ to: phoneE164, code });
  const verificationSid = (result as { sid?: string }).sid;
  return { status: result.status, sid: verificationSid };
}

export async function startOtp(
  phone: unknown
): Promise<{ ok: true }> {
  const requestId = getRequestId() ?? "unknown";
  try {
    try {
      await ensureOtpTableExists();
    } catch (err) {
      logError("otp_schema_self_heal_failed", { err, requestId });
    }

    let phoneE164: string;
    try {
      phoneE164 = assertE164(phone);
    } catch {
      const phoneTail = typeof phone === "string" ? getPhoneTail(phone) : "";
      logWarn("otp_start_invalid_phone", {
        phoneTail,
        status: "invalid_phone",
        requestId,
      });
      throw new AppError("invalid_phone", "Invalid phone number", 400);
    }

    const { client, verifyServiceSid } = assertTwilioConfig(requestId);
    const phoneTail = getPhoneTail(phoneE164);

    logInfo("otp_start_request", {
      phoneTail,
      serviceSid: verifyServiceSid,
      requestId,
    });

    try {
      const verification = await sendOtp(client, verifyServiceSid, phoneE164);
      logInfo("otp_start_success", {
        phoneTail,
        serviceSid: verifyServiceSid,
        verificationSid: verification.sid,
        status: verification.status,
        requestId,
      });
      return { ok: true };
    } catch (err: any) {
      const details = getTwilioErrorDetails(err);
      logError("auth_twilio_verify_failed", {
        action: "otp_start",
        phoneTail,
        serviceSid: verifyServiceSid,
        twilioCode: details.code,
        status: details.status,
        message: details.message,
        requestId,
      });
      if (isTwilioAuthError(err)) {
        throw new AppError(
          "twilio_verify_failed",
          "Invalid Twilio credentials",
          401
        );
      }
      throw new AppError(
        "twilio_verify_failed",
        "Twilio verification failed",
        502
      );
    }
  } catch (err) {
    logError("otp_start_failed", {
      requestId,
      error: err instanceof Error ? err.message : "unknown_error",
    });
    throw err;
  }
}

export async function verifyOtpCode(params: {
  phone: string;
  code: string;
  ip?: string;
  userAgent?: string;
  route?: string;
  method?: string;
}): Promise<{
  token: string;
  refreshToken: string;
  user: { id: string; role: Role; email: string | null };
}> {
  const requestId = getRequestId() ?? "unknown";
  try {
    try {
      await ensureOtpTableExists();
    } catch (err) {
      logError("otp_schema_self_heal_failed", { err, requestId });
    }

    const code = params.code?.trim() ?? "";
    if (!code) {
      logWarn("otp_verify_invalid_request", {
        status: "missing_fields",
        requestId,
      });
      throw new AppError("invalid_request", "Phone and code are required", 400);
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
        requestId,
      });
      throw new AppError("invalid_phone", "Invalid phone number", 400);
    }
    const phoneTail = getPhoneTail(phoneE164);
    let otpVerificationsAvailable = true;
    let precheckApproved: Awaited<
      ReturnType<typeof findApprovedOtpVerificationByPhone>
    > = null;
    try {
      precheckApproved = await findApprovedOtpVerificationByPhone({
        phone: phoneE164,
      });
    } catch (err) {
      if (isOtpVerificationTableMissing(err)) {
        otpVerificationsAvailable = false;
        logWarn("otp_verify_db_missing", {
          requestId,
          phoneTail,
          errorCode: "OTP_VERIFY_DB_MISSING",
        });
      } else {
        throw err;
      }
    }

    let status: string | undefined;
    let verificationSid: string | undefined;
    let verifyServiceSid: string | null = null;
    if (precheckApproved) {
      status = "approved";
      verificationSid = precheckApproved.verificationSid ?? "otp-approved";
    } else {
      const { client, verifyServiceSid: verifiedSid } =
        assertTwilioConfig(requestId);
      verifyServiceSid = verifiedSid;
      logInfo("otp_verify_request", {
        phoneTail,
        serviceSid: verifyServiceSid,
        requestId,
      });
      try {
        const check = await requestTwilioVerificationCheck(
          client,
          verifyServiceSid,
          phoneE164,
          code
        );
        status = check.status;
        verificationSid = check.sid;
        logInfo("otp_verify_result", {
          phoneTail,
          serviceSid: verifyServiceSid,
          status,
          verificationSid,
          requestId,
        });
      } catch (err) {
        const details = getTwilioErrorDetails(err);
        logError("auth_twilio_verify_failed", {
          action: "otp_verify",
          phoneTail,
          serviceSid: verifyServiceSid ?? "unknown",
          twilioCode: details.code,
          status: details.status,
          message: details.message,
          requestId,
          errorCode: getTwilioFailureCode(details.status),
        });
        if (isTwilioAuthError(err)) {
          throw new AppError(
            "twilio_verify_failed",
            "Invalid Twilio credentials",
            401
          );
        }
        throw new AppError(
          "verification_unavailable",
          "Verification service unavailable",
          502
        );
      }
    }
    if (!verificationSid) {
      logWarn("otp_verify_missing_sid", {
        phoneTail,
        requestId,
      });
      throw new AppError("otp_unavailable", "OTP verification unavailable", 503);
    }
    if (status !== "approved") {
      const userRecord = await findAuthUserByPhone(phoneE164);
      if (userRecord && otpVerificationsAvailable) {
        try {
          await createOtpVerification({
            userId: userRecord.id,
            phone: phoneE164,
            verificationSid,
            status: resolveOtpStatus(status),
            verifiedAt: null,
          });
        } catch (err) {
          if (isOtpVerificationTableMissing(err)) {
            otpVerificationsAvailable = false;
            logWarn("otp_verify_db_missing", {
              requestId,
              phoneTail,
              errorCode: "OTP_VERIFY_DB_MISSING",
            });
          } else {
            throw err;
          }
        }
      }
      throw new AppError("invalid_code", "Invalid or expired code", 401);
    }

    const client = await pool.connect();
    const db = client;
    try {
      await client.query("begin");
      const userRecord = precheckApproved
        ? await findAuthUserById(precheckApproved.userId, db)
        : await findAuthUserByPhone(phoneE164, db, {
            forUpdate: true,
          });
      if (!userRecord) {
        await client.query("commit");
        throw new AppError("user_not_found", "User not found.", 404);
      }

      assertUserActive({ user: userRecord, requestId, phoneTail });

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
      if (otpVerificationsAvailable && !precheckApproved) {
        await createOtpVerification({
          userId: userRecord.id,
          phone: phoneE164,
          verificationSid,
          status: "approved",
          verifiedAt: new Date(),
          client: db,
        });
      }

      const tokenVersion = userRecord.tokenVersion ?? 0;
      const payload: AccessTokenPayload = {
        sub: userRecord.id,
        role,
        tokenVersion,
      };
      const token = issueAccessToken(payload);
      const refresh = issueRefreshToken({
        userId: userRecord.id,
        tokenVersion,
      });
      await storeRefreshToken({
        userId: userRecord.id,
        token: refresh.token,
        tokenHash: refresh.tokenHash,
        expiresAt: refresh.expiresAt,
        client: db,
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
      return {
        token,
        refreshToken: refresh.token,
        user: {
          id: userRecord.id,
          role,
          email: userRecord.email,
        },
      };
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    logWarn("otp_verify_failed", {
      requestId,
      error: err instanceof Error ? err.message : "unknown_error",
    });
    throw err;
  }
}

export async function refreshSession(params: {
  refreshToken: string;
  ip?: string;
  userAgent?: string;
}): Promise<
  | {
      ok: true;
      token: string;
      refreshToken: string;
      user: { id: string; role: Role; email: string | null };
    }
  | {
      ok: false;
      status: number;
      error: { code: string; message: string };
    }
> {
  const requestId = getRequestId() ?? "unknown";
  try {
    const refreshToken = params.refreshToken?.trim();
    if (!refreshToken) {
      return {
        ok: false,
        status: 400,
        error: { code: "invalid_request", message: "Refresh token is required." },
      };
    }
    const payload = resolveRefreshPayload(verifyRefreshToken(refreshToken));
    const tokenHash = hashRefreshToken(refreshToken);

    const client = await pool.connect();
    const db = client;
    try {
      await client.query("begin");
      const consumed = await consumeRefreshToken(tokenHash, db);
      if (!consumed || consumed.userId !== payload.userId) {
        await client.query("commit");
        return {
          ok: false,
          status: 401,
          error: { code: "invalid_refresh_token", message: "Invalid refresh token." },
        };
      }

      const userRecord = await findAuthUserById(payload.userId, db);
      if (!userRecord) {
        await client.query("commit");
        return {
          ok: false,
          status: 401,
          error: { code: "invalid_refresh_token", message: "Invalid refresh token." },
        };
      }

      assertUserActive({ user: userRecord, requestId });

      let role: Role;
      try {
        role = resolveAuthRole(userRecord.role);
      } catch (err) {
        await client.query("commit");
        throw err;
      }

      const tokenVersion = userRecord.tokenVersion ?? 0;
      if (payload.tokenVersion !== tokenVersion) {
        await client.query("commit");
        return {
          ok: false,
          status: 401,
          error: { code: "invalid_refresh_token", message: "Invalid refresh token." },
        };
      }

      const token = issueAccessToken({
        sub: userRecord.id,
        role,
        tokenVersion,
      });
      const refreshed = issueRefreshToken({
        userId: userRecord.id,
        tokenVersion,
      });
      await storeRefreshToken({
        userId: userRecord.id,
        token: refreshed.token,
        tokenHash: refreshed.tokenHash,
        expiresAt: refreshed.expiresAt,
        client: db,
      });

      await recordAuditEvent({
        action: "token_refreshed",
        actorUserId: userRecord.id,
        targetUserId: userRecord.id,
        ip: params.ip,
        userAgent: params.userAgent,
        success: true,
        client: db,
      });

      await client.query("commit");
      return {
        ok: true,
        token,
        refreshToken: refreshed.token,
        user: {
          id: userRecord.id,
          role,
          email: userRecord.email,
        },
      };
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err instanceof AppError) {
      const status = err.status >= 500 ? 503 : err.status;
      return {
        ok: false,
        status,
        error: { code: err.code, message: err.message },
      };
    }
    logWarn("refresh_failed", {
      requestId,
      error: err instanceof Error ? err.message : "unknown_error",
    });
    return {
      ok: false,
      status: 503,
      error: {
        code: "service_unavailable",
        message: "Authentication service unavailable.",
      },
    };
  }
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
