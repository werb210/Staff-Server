import { type NextFunction, type Request, type Response } from "express";
import { AppError } from "./errors";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const attemptsByIp = new Map<string, RateLimitEntry>();

export function loginRateLimit(
  maxAttempts = 5,
  windowMs = 60_000
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const ip = req.ip || "unknown";
    const now = Date.now();
    const entry = attemptsByIp.get(ip);
    if (!entry || entry.resetAt < now) {
      attemptsByIp.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    entry.count += 1;
    if (entry.count > maxAttempts) {
      next(new AppError("rate_limited", "Too many login attempts.", 429));
      return;
    }
    next();
  };
}

export function resetLoginRateLimit(): void {
  attemptsByIp.clear();
}
