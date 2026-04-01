import { type NextFunction, type Request, type Response } from "express";

type RateLimitEntry = {
  count: number;
  ts: number;
};

const hits = new Map<string, RateLimitEntry>();

export function resetRateLimitForTests() {
  hits.clear();
}

export function rateLimit(limit = 100, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip;
    const now = Date.now();
    const entry = hits.get(key) ?? { count: 0, ts: now };

    if (now - entry.ts > windowMs) {
      entry.count = 0;
      entry.ts = now;
    }

    entry.count += 1;
    hits.set(key, entry);

    if (entry.count > limit) {
      return res.status(429).json({ status: "error", error: "RATE_LIMIT" });
    }

    return next();
  };
}
