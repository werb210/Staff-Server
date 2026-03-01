import type { NextFunction, Request, Response } from "express";
import { createHash } from "crypto";

const cache = new Map<string, any>();

export function hashIdempotencyKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  return createHash("sha256").update(key).digest("hex");
}

export function idempotencyMiddleware(req: Request, res: Response, next: NextFunction) {
  const key = req.get("idempotency-key");

  if (!key) {
    return next();
  }

  if (cache.has(key)) {
    return res.status(200).json(cache.get(key));
  }

  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    cache.set(key, body);
    return originalJson(body);
  };

  next();
}

export const idempotency = idempotencyMiddleware;
