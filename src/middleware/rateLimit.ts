import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errors";
import {
  getDocumentUploadRateLimitMax,
  getDocumentUploadRateLimitWindowMs,
  getLenderSubmissionRateLimitMax,
  getLenderSubmissionRateLimitWindowMs,
  getLoginRateLimitMax,
  getLoginRateLimitWindowMs,
  getPasswordResetRateLimitMax,
  getPasswordResetRateLimitWindowMs,
  getRefreshRateLimitMax,
  getRefreshRateLimitWindowMs,
} from "../config";

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

type RefreshPayload = { userId?: string };

export function refreshRateLimit(
  maxAttempts = getRefreshRateLimitMax(),
  windowMs = getRefreshRateLimitWindowMs()
): (req: Request, res: Response, next: NextFunction) => void {
  return createRateLimiter(
    (req) => {
      const ip = req.ip || "unknown";
      const token =
        typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";
      const decoded = token ? (jwt.decode(token) as RefreshPayload | null) : null;
      const userId = decoded?.userId ?? "unknown";
      return `refresh:${ip}:${userId}`;
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
