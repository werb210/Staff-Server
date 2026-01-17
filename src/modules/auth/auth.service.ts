import jwt from "jsonwebtoken";
import {
  getTwilioClient,
  isTwilioEnabled,
  getTwilioVerifyServiceSid,
} from "../../services/twilio";
import {
  createUser,
  createOtpVerification,
  findAuthUserByPhone,
  findAuthUserById,
  findApprovedOtpVerificationByPhone,
  setPhoneVerified,
  updateUserRoleById,
} from "./auth.repo";
import { AppError, forbiddenError } from "../../middleware/errors";
import { recordAuditEvent } from "../audit/audit.service";
import { pool } from "../../db";
import { ROLES, type Role, isRole } from "../../auth/roles";
import { logError, logInfo, logWarn } from "../../observability/logger";
import { getRequestId } from "../../middleware/requestContext";
import { normalizePhoneNumber } from "./phone";
import { ensureOtpTableExists } from "../../db/ensureOtpTable";

type AccessTokenPayload = {
  sub: string;
  role: Role;
};

function assertE164(phone: unknown): string {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    throw new Error("Phone number must be in E.164 format");
  }
  return normalized;
}

function issueAccessToken(payload: AccessTokenPayload): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 503);
  }
  return jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn: "15m",
  });
}

export function assertAuthSubsystem(): void {
  const accessSecret = process.env.JWT_SECRET;
  if (!accessSecret) {
    throw new AppError("auth_misconfigured", "Auth is not configured.", 503);
  }
}

type TwilioErrorDetails = {
  code?: number | string;
  status?: number;
  message: string;
};

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

type StartOtpResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      error: { code: string; message: string };
      twilioCode?: number | string;
    };

export async function startOtp(phone: unknown): Promise<StartOtpResult> {
  try {
    const requestId = getRequestId() ?? "unknown";
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
      return {
        ok: false,
        status: 400,
        error: { code: "invalid_phone", message: "Invalid phone number" },
      };
    }

    if (!isTwilioEnabled()) {
      if (process.env.NODE_ENV === "production") {
        throw new AppError("twilio_unavailable", "Twilio is not configured.", 503);
      }
      logWarn("otp_start_twilio_disabled", {
        phoneTail: getPhoneTail(phoneE164),
        requestId,
      });
      return {
        ok: false,
        status: 424,
        error: {
          code: "twilio_unavailable",
          message: "Twilio is not configured.",
        },
      };
    }

    const client = getTwilioClient();
    const verifyServiceSid = getTwilioVerifyServiceSid();
    if (!client || !verifyServiceSid) {
      throw new AppError("twilio_unavailable", "Twilio is not configured.", 503);
    }

    const phoneTail = getPhoneTail(phoneE164);
    try {
      const verification = await client.verify.v2
        .services(verifyServiceSid)
        .verifications.create({ to: phoneE164, channel: "sms" });
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
      logWarn("auth_twilio_verify_failed", {
        action: "otp_start",
        phoneTail,
        serviceSid: verifyServiceSid,
        twilioCode: details.code,
        status: details.status,
        message: details.message,
        requestId,
      });
      return {
        ok: false,
        status: 502,
        error: { code: "twilio_verify_failed", message: "Twilio verification failed" },
        twilioCode: details.code,
      };
    }
  } catch (err) {
    const requestId = getRequestId() ?? "unknown";
    logError("otp_start_failed", {
      requestId,
      error: err instanceof Error ? err.message : "unknown_error",
    });
    return {
      ok: false,
      status: 503,
      error: {
        code: "otp_unavailable",
        message: "OTP service unavailable",
      },
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
  | { ok: true; token: string; user: { id: string; role: Role; email: string | null } }
  | {
      ok: false;
      status: number;
      error: { code: string; message: string };
      twilioCode?: number | string;
    }
> {
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
        error: {
          code: "invalid_request",
          message: "Phone and code are required",
        },
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
      try {
        const client = getTwilioClient();
        verifyServiceSid = getTwilioVerifyServiceSid();
        if (!isTwilioEnabled() || !client || !verifyServiceSid) {
          if (process.env.NODE_ENV === "production") {
            throw new AppError(
              "twilio_unavailable",
              "Twilio is not configured.",
              503
            );
          }
          logWarn("otp_verify_twilio_disabled", {
            phoneTail,
            requestId,
          });
          return {
            ok: false,
            status: 424,
            error: {
              code: "twilio_unavailable",
              message: "Twilio is not configured.",
            },
          };
        }

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
        logWarn("auth_twilio_verify_failed", {
          action: "otp_verify",
          phoneTail,
          serviceSid: verifyServiceSid ?? "unknown",
          twilioCode: details.code,
          status: details.status,
          message: details.message,
          requestId,
          errorCode: getTwilioFailureCode(details.status),
        });
        if (otpVerificationsAvailable) {
          try {
            const approved = await findApprovedOtpVerificationByPhone({
              phone: phoneE164,
            });
            if (approved) {
              logWarn("twilio_verify_failed_post_auth", {
                phoneTail,
                serviceSid: verifyServiceSid ?? "unknown",
                twilioCode: details.code,
                status: details.status,
                message: details.message,
                requestId,
                errorCode: getTwilioFailureCode(details.status),
              });
              precheckApproved = approved;
              status = "approved";
              verificationSid = approved.verificationSid ?? verificationSid;
            }
          } catch (dbErr) {
            if (isOtpVerificationTableMissing(dbErr)) {
              otpVerificationsAvailable = false;
              logWarn("otp_verify_db_missing", {
                requestId,
                phoneTail,
                errorCode: "OTP_VERIFY_DB_MISSING",
              });
            } else {
              throw dbErr;
            }
          }
        }
        return {
          ok: false,
          status: 502,
          error: {
            code: "verification_unavailable",
            message: "Verification service unavailable",
          },
          twilioCode: details.code,
        };
      }
    }
    if (!verificationSid) {
      logWarn("otp_verify_missing_sid", {
        phoneTail,
        requestId,
      });
      return {
        ok: false,
        status: 503,
        error: {
          code: "otp_unavailable",
          message: "OTP verification unavailable",
        },
      };
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
      return {
        ok: false,
        status: 401,
        error: { code: "invalid_code", message: "Invalid or expired code" },
      };
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
      const isDisabled = userRecord.disabled === true;
      if (isDisabled) {
        await client.query("commit");
        throw new AppError("account_disabled", "Account is disabled.", 403);
      }
      if (userRecord.isActive === false) {
        logInfo("otp_verify_inactive_user", {
          userId: userRecord.id,
          phoneTail,
          requestId,
        });
        await client.query("commit");
        throw new AppError("user_disabled", "Account is inactive.", 403);
      }
      const isActive = userRecord.active === true || userRecord.isActive === true;
      if (!isActive) {
        logInfo("otp_verify_inactive_user", {
          userId: userRecord.id,
          phoneTail,
          requestId,
        });
        await client.query("commit");
        throw new AppError("user_disabled", "Account is inactive.", 403);
      }
      const isLocked =
        userRecord.lockedUntil && userRecord.lockedUntil.getTime() > Date.now();
      if (isLocked) {
        await client.query("commit");
        throw new AppError("locked", "Account is locked.", 403);
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

      const payload: AccessTokenPayload = {
        sub: userRecord.id,
        role,
      };
      const token = issueAccessToken(payload);
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
        ok: true,
        token,
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
    logWarn("otp_verify_failed", {
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
