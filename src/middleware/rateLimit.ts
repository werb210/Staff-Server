import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errors";
import {
  getDocumentUploadRateLimitMax,
  getDocumentUploadRateLimitWindowMs,
  getClientSubmissionRateLimitMax,
  getClientSubmissionRateLimitWindowMs,
  getLenderSubmissionRateLimitMax,
  getLenderSubmissionRateLimitWindowMs,
  getLoginRateLimitMax,
  getLoginRateLimitWindowMs,
  getPasswordResetRateLimitMax,
  getPasswordResetRateLimitWindowMs,
  getRefreshRateLimitMax,
  getRefreshRateLimitWindowMs,
  getAdminRateLimitMax,
  getAdminRateLimitWindowMs,
  getGlobalRateLimitMaxConfig,
  getGlobalRateLimitWindowMsConfig,
  isTestEnvironment,
  getPwaPushRateLimitMax,
  getPwaPushRateLimitWindowMs,
} from "../config";
import { logWarn } from "../observability/logger";
import { hashRefreshToken } from "../auth/tokenUtils";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const attemptsByKey = new Map<string, RateLimitEntry>();

type KeyBuilder = (req: Request) => string;

function createRateLimiter(
  keyBuilder: KeyBuilder,
  maxAttempts = 10,
  windowMs = 60_000
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (isTestEnvironment()) {
      next();
      return;
    }
    const key = keyBuilder(req);
    const now = Date.now();
    const entry = attemptsByKey.get(key);
    if (!entry || entry.resetAt < now) {
      attemptsByKey.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    entry.count += 1;
    if (entry.count > maxAttempts) {
      logWarn("rate_limit_exceeded", {
        key,
        limit: maxAttempts,
        windowMs,
      });
      next(new AppError("rate_limited", "Too many attempts.", 429));
      return;
    }
    next();
  };
}

export function loginRateLimit(
  maxAttempts = getLoginRateLimitMax(),
  windowMs = getLoginRateLimitWindowMs()
): (req: Request, res: Response, next: NextFunction) => void {
  return createRateLimiter(
    (req) => {
      const ip = req.ip || "unknown";
      const email =
        typeof req.body?.email === "string"
          ? req.body.email.toLowerCase()
          : "unknown";
      return `login:${ip}:${email}`;
    },
    maxAttempts,
    windowMs
  );
}

export function otpRateLimit(
  maxAttempts = getLoginRateLimitMax(),
  windowMs = getLoginRateLimitWindowMs()
): (req: Request, res: Response, next: NextFunction) => void {
  const sendLimiter = otpSendLimiter(maxAttempts, windowMs);
  const verifyLimiter = otpVerifyLimiter(maxAttempts, windowMs);
  return (req: Request, res: Response, next: NextFunction): void => {
    const path = req.originalUrl ?? req.path;
    const isVerify = path.includes("/otp/verify");
    if (!isVerify) {
      sendLimiter(req, res, next);
      return;
    }
    const phone = typeof req.body?.phone === "string" ? req.body.phone : "";
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300 && phone) {
        resetOtpRateLimit(phone);
      }
    });
    verifyLimiter(req, res, next);
  };
}

function getOtpPhone(req: Request): string {
  return typeof req.body?.phone === "string" ? req.body.phone : "unknown";
}

function buildOtpKey(prefix: string, phone: string): string {
  return `${prefix}:${phone}`;
}

export function otpSendLimiter(
  maxAttempts = getLoginRateLimitMax(),
  windowMs = getLoginRateLimitWindowMs()
): (req: Request, res: Response, next: NextFunction) => void {
  return createRateLimiter(
    (req) => buildOtpKey("otp_send", getOtpPhone(req)),
    maxAttempts,
    windowMs
  );
}

export function otpVerifyLimiter(
  maxAttempts = getLoginRateLimitMax(),
  windowMs = getLoginRateLimitWindowMs()
): (req: Request, res: Response, next: NextFunction) => void {
  return createRateLimiter(
    (req) => buildOtpKey("otp_verify", getOtpPhone(req)),
    maxAttempts,
    windowMs
  );
}

export function resetOtpSendLimiter(phone: string): void {
  if (!phone) {
    return;
  }
  attemptsByKey.delete(buildOtpKey("otp_send", phone));
}

export function resetOtpVerifyLimiter(phone: string): void {
  if (!phone) {
    return;
  }
  attemptsByKey.delete(buildOtpKey("otp_verify", phone));
}

export function resetOtpRateLimit(phone: string): void {
  resetOtpSendLimiter(phone);
  resetOtpVerifyLimiter(phone);
}

export function refreshRateLimit(
  maxAttempts = getRefreshRateLimitMax(),
  windowMs = getRefreshRateLimitWindowMs()
): (req: Request, res: Response, next: NextFunction) => void {
  return createRateLimiter(
    (req) => {
      const ip = req.ip || "unknown";
      const token =
        typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";
      const decoded = token ? (jwt.decode(token) as jwt.JwtPayload | null) : null;
      const userId = typeof decoded?.sub === "string" ? decoded.sub : "unknown";
      const tokenHash = token ? hashRefreshToken(token).slice(0, 8) : "none";
      return `refresh:${ip}:${userId}:${tokenHash}`;
    },
    maxAttempts,
    windowMs
  );
}

export function passwordResetRateLimit(
  maxAttempts = getPasswordResetRateLimitMax(),
  windowMs = getPasswordResetRateLimitWindowMs()
): (req: Request, res: Response, next: NextFunction) => void {
  return createRateLimiter(
    (req) => {
      const ip = req.ip || "unknown";
      const userId =
        typeof req.body?.userId === "string" ? req.body.userId : "unknown";
      const token =
        typeof req.body?.token === "string" ? req.body.token : "unknown";
      return `password_reset:${ip}:${userId}:${token}`;
    },
    maxAttempts,
    windowMs
  );
}

export function resetLoginRateLimit(): void {
  attemptsByKey.clear();
}

export function pushSendRateLimit(
  maxAttempts = getPwaPushRateLimitMax(),
  windowMs = getPwaPushRateLimitWindowMs()
): (req: Request, res: Response, next: NextFunction) => void {
  return createRateLimiter(
    (req) => {
      const userId = req.user?.userId ?? "unknown";
      const ip = req.ip || "unknown";
      return `push_send:${userId}:${ip}`;
    },
    maxAttempts,
    windowMs
  );
}

export function documentUploadRateLimit(
  maxAttempts = getDocumentUploadRateLimitMax(),
  windowMs = getDocumentUploadRateLimitWindowMs()
): (req: Request, res: Response, next: NextFunction) => void {
  return createRateLimiter(
    (req) => {
      const ip = req.ip || "unknown";
      const userId = req.user?.userId ?? "unknown";
      const applicationId =
        typeof req.params?.id === "string" ? req.params.id : "unknown";
      return `document_upload:${ip}:${userId}:${applicationId}`;
    },
    maxAttempts,
    windowMs
  );
}

export function clientSubmissionRateLimit(
  maxAttempts = getClientSubmissionRateLimitMax(),
  windowMs = getClientSubmissionRateLimitWindowMs()
): (req: Request, res: Response, next: NextFunction) => void {
  return createRateLimiter(
    (req) => {
      const ip = req.ip || "unknown";
      const submissionKey =
        typeof req.body?.submissionKey === "string" ? req.body.submissionKey : "unknown";
      return `client_submission:${ip}:${submissionKey}`;
    },
    maxAttempts,
    windowMs
  );
}

export function lenderSubmissionRateLimit(
  maxAttempts = getLenderSubmissionRateLimitMax(),
  windowMs = getLenderSubmissionRateLimitWindowMs()
): (req: Request, res: Response, next: NextFunction) => void {
  return createRateLimiter(
    (req) => {
      const ip = req.ip || "unknown";
      const userId = req.user?.userId ?? "unknown";
      const applicationId =
        typeof req.body?.applicationId === "string"
          ? req.body.applicationId
          : "unknown";
      return `lender_submission:${ip}:${userId}:${applicationId}`;
    },
    maxAttempts,
    windowMs
  );
}

export function adminRateLimit(
  maxAttempts = getAdminRateLimitMax(),
  windowMs = getAdminRateLimitWindowMs()
): (req: Request, res: Response, next: NextFunction) => void {
  return createRateLimiter(
    (req) => {
      const ip = req.ip || "unknown";
      const userId = req.user?.userId ?? "unknown";
      return `admin:${ip}:${userId}`;
    },
    maxAttempts,
    windowMs
  );
}

export function globalRateLimit(
  maxAttempts = getGlobalRateLimitMaxConfig(),
  windowMs = getGlobalRateLimitWindowMsConfig()
): (req: Request, res: Response, next: NextFunction) => void {
  return createRateLimiter(
    (req) => {
      const ip = req.ip || "unknown";
      return `global:${ip}`;
    },
    maxAttempts,
    windowMs
  );
}
