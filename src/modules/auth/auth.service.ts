import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";
import {
  createUser,
  createOtpVerification,
  findAuthUserByPhone,
  findAuthUserById,
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
  getAccessTokenSecret,
  getRefreshTokenExpiresIn,
  getRefreshTokenExpiresInMs,
  getRefreshTokenSecret,
  getJwtClockSkewSeconds,
} from "../../config";
import {
  signAccessToken,
  type AccessTokenPayload,
} from "../../auth/jwt";
import { DEFAULT_AUTH_SILO } from "../../auth/silo";
import { hashRefreshToken } from "../../auth/tokenUtils";
import { getCapabilitiesForRole } from "../../auth/capabilities";
import {
  getTwilioClient,
  getTwilioVerifyServiceSid,
  sendOtp,
  checkOtp,
} from "../../services/twilio";

type RefreshTokenPayload = JwtPayload & {
  sub?: string;
  tokenVersion?: number;
  type?: string;
  jti?: string;
};

type VerifyOtpSuccess = {
  ok: true;
  token: string;
  refreshToken: string;
  user: { id: string; role: Role; email: string | null };
};

type VerifyOtpFailure = {
  ok: false;
  status: number;
  error: { code: string; message: string };
};

function assertE164(phone: unknown): string {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    throw new Error("Phone number must be in E.164 format");
  }
  return normalized;
}

export function issueAccessToken(payload: AccessTokenPayload): string {
  try {
    return signAccessToken(payload);
  } catch (err) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 500);
  }
}

export function issueRefreshToken(params: {
  userId: string;
  tokenVersion: number;
}): { token: string; tokenHash: string; expiresAt: Date } {
  const secret = getRefreshTokenSecret();
  if (!secret) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 500);
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
    throw new AppError("auth_misconfigured", "Auth is not configured.", 500);
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

function resolveAuthSilo(silo: string | null | undefined): string {
  if (typeof silo === "string" && silo.trim().length > 0) {
    return silo.trim();
  }
  return DEFAULT_AUTH_SILO;
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
    throw new AppError("auth_misconfigured", "Auth is not configured.", 500);
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
const OTP_VERIFY_DEDUP_WINDOW_MS = 1500;
const otpVerifyInFlight = new Map<string, NodeJS.Timeout>();

function assertSingleVerifyAttempt(phoneE164: string): void {
  if (otpVerifyInFlight.has(phoneE164)) {
    throw new AppError(
      "otp_verify_in_progress",
      "OTP verification already in progress.",
      429
    );
  }
  const timeout = setTimeout(() => {
    otpVerifyInFlight.delete(phoneE164);
  }, OTP_VERIFY_DEDUP_WINDOW_MS);
  otpVerifyInFlight.set(phoneE164, timeout);
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
      message:
        typeof err.message === "string" ? err.message : "Twilio verification failed",
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

function assertTwilioConfig(requestId: string): void {
  const missing = getMissingTwilioEnv();
  if (missing.length > 0) {
    logError("twilio_missing_env", { missing, requestId });
    throw new AppError("twilio_misconfigured", "Twilio is not configured.", 500);
  }
  if (process.env.NODE_ENV === "production") {
    const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
    const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID ?? "";
    const invalidValues: string[] = [];
    if (
      accountSid.startsWith("ACxxxx") ||
      accountSid.includes("XXXXXXXXXXXXXXXX")
    ) {
      invalidValues.push("TWILIO_ACCOUNT_SID");
    }
    if (authToken === "token" || authToken.toLowerCase().includes("test")) {
      invalidValues.push("TWILIO_AUTH_TOKEN");
    }
    if (verifyServiceSid === "VA00000000000000000000000000000000") {
      invalidValues.push("TWILIO_VERIFY_SERVICE_SID");
    }
    if (invalidValues.length > 0) {
      logError("twilio_invalid_env", { invalidValues, requestId });
      throw new AppError("twilio_misconfigured", "Twilio is not configured.", 500);
    }
  }
}

function isTwilioAuthError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 20003
  );
}

function isTwilioUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string") {
    return ["ENOTFOUND", "ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"].includes(
      code
    );
  }
  return false;
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

function attachTwilioDetails(error: AppError, details: TwilioErrorDetails): AppError {
  const twilioCode =
    typeof details.code === "number" || typeof details.code === "string"
      ? details.code
      : undefined;
  const twilioMessage = details.message;
  (error as { details?: unknown }).details = {
    twilioCode,
    twilioMessage,
  };
  return error;
}

function mapTwilioVerifyError(details: TwilioErrorDetails, err: unknown): AppError {
  if (isTwilioAuthError(err)) {
    return attachTwilioDetails(
      new AppError(
        "twilio_auth_failed",
        "Twilio authentication failed.",
        500
      ),
      details
    );
  }

  const codeValue =
    typeof details.code === "string"
      ? Number(details.code)
      : details.code;

  if (codeValue === 60203) {
    return attachTwilioDetails(
      new AppError("too_many_attempts", details.message, 429),
      details
    );
  }

  if (codeValue === 60202) {
    return attachTwilioDetails(
      new AppError("expired_code", details.message, 410),
      details
    );
  }

  if (codeValue === 60200 || codeValue === 20404 || details.status === 404) {
    return attachTwilioDetails(
      new AppError("invalid_code", details.message, 400),
      details
    );
  }

  if (details.status && details.status >= 500) {
    return attachTwilioDetails(
      new AppError("auth_provider_unavailable", details.message, 503),
      details
    );
  }

  if (isTwilioUnavailableError(err)) {
    return attachTwilioDetails(
      new AppError("auth_provider_unavailable", details.message, 503),
      details
    );
  }

  return attachTwilioDetails(
    new AppError("twilio_error", details.message, 500),
    details
  );
}

function mapTwilioVerifyCheckFailure(
  details: TwilioErrorDetails,
  err: unknown
): VerifyOtpFailure | AppError {
  if (isTwilioAuthError(err)) {
    return attachTwilioDetails(
      new AppError(
        "twilio_auth_failed",
        "Twilio authentication failed.",
        500
      ),
      details
    );
  }

  const codeValue =
    typeof details.code === "string"
      ? Number(details.code)
      : details.code;

  if (codeValue === 60203) {
    return {
      ok: false,
      status: 429,
      error: { code: "too_many_attempts", message: details.message },
    };
  }

  if (codeValue === 60202) {
    return {
      ok: false,
      status: 410,
      error: { code: "expired_code", message: details.message },
    };
  }

  if (codeValue === 60200 || codeValue === 20404 || details.status === 404) {
    return {
      ok: false,
      status: 400,
      error: { code: "invalid_code", message: details.message },
    };
  }

  if (details.status && details.status >= 500) {
    return attachTwilioDetails(
      new AppError("auth_provider_unavailable", details.message, 503),
      details
    );
  }

  if (isTwilioUnavailableError(err)) {
    return attachTwilioDetails(
      new AppError("auth_provider_unavailable", details.message, 503),
      details
    );
  }

  return attachTwilioDetails(
    new AppError("twilio_error", details.message, 500),
    details
  );
}

function shouldThrowOtpError(error: AppError): boolean {
  return [
    "twilio_misconfigured",
    "auth_provider_unavailable",
    "twilio_auth_failed",
    "twilio_error",
  ].includes(error.code);
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

function resolveOtpFailure(status?: string): VerifyOtpFailure {
  if (status === "canceled" || status === "expired") {
    return {
      ok: false,
      status: 410,
      error: { code: "expired_code", message: "OTP code expired." },
    };
  }
  return {
    ok: false,
    status: 400,
    error: { code: "invalid_code", message: "Invalid or expired code" },
  };
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

export async function startOtp(
  phone: unknown
): Promise<{ ok: true; sid: string }> {
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

    assertTwilioConfig(requestId);
    const twilio = getTwilioClient();
    const serviceSid = getTwilioVerifyServiceSid();
    if (!twilio || !serviceSid) {
      throw new AppError("twilio_misconfigured", "Twilio is not configured.", 500);
    }
    const phoneTail = getPhoneTail(phoneE164);

    logInfo("otp_start_request", {
      phoneTail,
      serviceSid,
      requestId,
    });

    try {
      const verification = await sendOtp(twilio, serviceSid, phoneE164);
      logInfo("otp_start_success", {
        phoneTail,
        serviceSid,
        verificationSid: verification.sid,
        status: verification.status,
        requestId,
      });
      return { ok: true, sid: verification.sid ?? "unknown" };
    } catch (err: any) {
      const details = getTwilioErrorDetails(err);
      logError("auth_twilio_verify_failed", {
        action: "otp_start",
        phoneTail,
        serviceSid,
        twilioCode: details.code,
        status: details.status,
        message: details.message,
        requestId,
        error: err,
      });
      throw mapTwilioVerifyError(details, err);
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
}): Promise<VerifyOtpSuccess | VerifyOtpFailure> {
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
      return {
        ok: false,
        status: 400,
        error: { code: "invalid_request", message: "Phone and code are required" },
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
        requestId,
      });
      return {
        ok: false,
        status: 400,
        error: { code: "invalid_phone", message: "Invalid phone number" },
      };
    }
    const phoneTail = getPhoneTail(phoneE164);
    assertSingleVerifyAttempt(phoneE164);
    let otpVerificationsAvailable = true;
    let status: string | undefined;
    let verificationSid: string | undefined;
    assertTwilioConfig(requestId);
    const twilio = getTwilioClient();
    const serviceSid = getTwilioVerifyServiceSid();
    if (!twilio || !serviceSid) {
      throw new AppError("twilio_misconfigured", "Twilio is not configured.", 500);
    }

    logInfo("otp_verify_request", {
      phoneTail,
      serviceSid,
      requestId,
    });
    try {
      const check = await checkOtp(twilio, serviceSid, phoneE164, code);
      status = check.status;
      verificationSid = check.sid;
      logInfo("otp_verify_result", {
        phoneTail,
        serviceSid,
        status,
        verificationSid,
        requestId,
      });
    } catch (err) {
      const details = getTwilioErrorDetails(err);
      logError("auth_twilio_verify_failed", {
        action: "otp_verify",
        phoneTail,
        serviceSid,
        twilioCode: details.code,
        status: details.status,
        message: details.message,
        requestId,
        error: err,
      });
      const mapped = mapTwilioVerifyCheckFailure(details, err);
      if (mapped instanceof AppError) {
        throw mapped;
      }
      return mapped;
    }
    if (!verificationSid) {
      logWarn("otp_verify_missing_sid", {
        phoneTail,
        requestId,
      });
      throw new AppError(
        "twilio_error",
        "Twilio verification failed (missing verification SID).",
        500
      );
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
      return resolveOtpFailure(status);
    }

    const dbClient = await pool.connect();
    const db = dbClient;
    try {
      await dbClient.query("begin");
      let userRecord = await findAuthUserByPhone(phoneE164, db, {
        forUpdate: true,
      });
      if (!userRecord) {
        const bootstrapRole = isBootstrapAdminUser({
          phoneNumber: phoneE164,
          email: null,
        })
          ? ROLES.ADMIN
          : ROLES.STAFF;
        userRecord = await createUser({
          phoneNumber: phoneE164,
          role: bootstrapRole,
          client: db,
        });
      }

      assertUserActive({ user: userRecord, requestId, phoneTail });

      let role = userRecord.role;
      if (!role || !isRole(role)) {
        if (isBootstrapAdminUser(userRecord)) {
          await updateUserRoleById(userRecord.id, ROLES.ADMIN, db);
          role = ROLES.ADMIN;
        } else {
          await dbClient.query("commit");
          return {
            ok: false,
            status: 403,
            error: { code: "forbidden", message: "User has no assigned role" },
          };
        }
      }

      await setPhoneVerified(userRecord.id, true, db);
      if (otpVerificationsAvailable) {
        try {
          await createOtpVerification({
            userId: userRecord.id,
            phone: phoneE164,
            verificationSid,
            status: "approved",
            verifiedAt: new Date(),
            client: db,
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

      const tokenVersion = userRecord.tokenVersion ?? 0;
      const payload: AccessTokenPayload = {
        sub: userRecord.id,
        role,
        tokenVersion,
        phone: userRecord.phoneNumber,
        silo: resolveAuthSilo(userRecord.silo),
        capabilities: getCapabilitiesForRole(role),
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

      await dbClient.query("commit");
      return {
        ok: true,
        token,
        refreshToken: refresh.token,
        user: {
          id: userRecord.id,
          role,
          email: userRecord.email,
        },
      };
    } catch (err) {
      await dbClient.query("rollback");
      throw err;
    } finally {
      dbClient.release();
    }
  } catch (err) {
    if (err instanceof AppError) {
      if (shouldThrowOtpError(err)) {
        throw err;
      }
      return {
        ok: false,
        status: err.status,
        error: { code: err.code, message: err.message },
      };
    }
    logWarn("otp_verify_failed", {
      requestId,
      error: err instanceof Error ? err.message : "unknown_error",
    });
    return {
      ok: false,
      status: 500,
      error: { code: "otp_verify_failed", message: "OTP verification failed." },
    };
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

    const dbClient = await pool.connect();
    const db = dbClient;
    try {
      await dbClient.query("begin");
      const consumed = await consumeRefreshToken(tokenHash, db);
      if (!consumed || consumed.userId !== payload.userId) {
        await dbClient.query("commit");
        return {
          ok: false,
          status: 401,
          error: { code: "invalid_refresh_token", message: "Invalid refresh token." },
        };
      }

      const userRecord = await findAuthUserById(payload.userId, db);
      if (!userRecord) {
        await dbClient.query("commit");
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
        await dbClient.query("commit");
        throw err;
      }

      const tokenVersion = userRecord.tokenVersion ?? 0;
      if (payload.tokenVersion !== tokenVersion) {
        await dbClient.query("commit");
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
        phone: userRecord.phoneNumber,
        silo: resolveAuthSilo(userRecord.silo),
        capabilities: getCapabilitiesForRole(role),
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

      await dbClient.query("commit");
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
      await dbClient.query("rollback");
      throw err;
    } finally {
      dbClient.release();
    }
  } catch (err) {
    if (err instanceof AppError) {
      return {
        ok: false,
        status: err.status,
        error: { code: err.code, message: err.message },
      };
    }
    logWarn("refresh_failed", {
      requestId,
      error: err instanceof Error ? err.message : "unknown_error",
    });
    return {
      ok: false,
      status: 500,
      error: {
        code: "auth_failed",
        message: "Authentication failed.",
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
  const dbClient = await pool.connect();
  const db = dbClient;
  try {
    await dbClient.query("begin");
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
    await dbClient.query("commit");
    return { id: user.id, email: user.email, role: params.role };
  } catch (err) {
    await dbClient.query("rollback");
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
    dbClient.release();
  }
}
