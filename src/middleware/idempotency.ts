import { type NextFunction, type Request, type Response } from "express";
import { createHash } from "crypto";
import { type PoolClient } from "pg";
import { pool } from "../db";
import { isDbConnectionFailure, isTestEnvironment } from "../dbRuntime";
import { AppError } from "./errors";
import { isProductionEnvironment } from "../config";
import {
  createIdempotencyRecord,
  findIdempotencyRecord,
} from "../modules/idempotency/idempotency.repo";
import { logWarn } from "../observability/logger";
import { trackEvent } from "../observability/appInsights";
import { setRequestIdempotencyKeyHash } from "./requestContext";

const IDEMPOTENCY_HEADER = "idempotency-key";
const ENFORCED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function advisoryLockKey(value: string): [number, number] {
  const hash = createHash("sha256").update(value).digest();
  return [hash.readInt32BE(0), hash.readInt32BE(4)];
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`)
    .join(",")}}`;
}

function isAuthRoute(req: Request): boolean {
  return req.path.startsWith("/api/auth/");
}

function shouldBypass(error: unknown): boolean {
  if (isDbConnectionFailure(error)) return true;
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: string }).code;
  return code === "42P01" || code === "42703" || code === "42P07";
}

export function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (isAuthRoute(req)) return next();
  if (!ENFORCED_METHODS.has(req.method)) return next();

  const rawKey = req.get(IDEMPOTENCY_HEADER)?.trim();
  if (!rawKey) {
    if (!isProductionEnvironment()) {
      logWarn("idempotency_key_missing", {
        route: req.originalUrl,
        requestId: res.locals.requestId ?? "unknown",
      });
    }
    return next(
      new AppError(
        "missing_idempotency_key",
        "Idempotency-Key header is required.",
        400
      )
    );
  }

  if (rawKey.length > 128) {
    return next(
      new AppError(
        "idempotency_key_too_long",
        "Idempotency-Key is too long.",
        400
      )
    );
  }

  const requestId = res.locals.requestId ?? "unknown";
  const route = req.path;
  const requestHash = sha256(stableStringify(req.body ?? {}));
  const keyHash = sha256(rawKey);

  setRequestIdempotencyKeyHash(keyHash);

  if (isTestEnvironment() && req.get("authorization")) {
    return next();
  }

  const lockKey = advisoryLockKey(`${route}:${rawKey}`);
  let client: PoolClient | null = null;
  let finalized = false;

  const finalize = async (): Promise<void> => {
    if (finalized) return;
    finalized = true;

    try {
      if (!client) return;

      if (res.statusCode < 500 && !res.locals.requestTimedOut) {
        await createIdempotencyRecord({
          idempotencyKey: rawKey,
          route,
          method: req.method,
          requestHash,
          responseCode: res.statusCode,
          responseBody: res.locals.idempotencyResponseBody ?? null,
          client,
        });
      }
    } catch (err) {
      logWarn("idempotency_persist_failed", {
        requestId,
        route,
        error: err instanceof Error ? err.message : "unknown_error",
      });
    } finally {
      if (client) {
        try {
          await client.query("select pg_advisory_unlock($1,$2)", lockKey);
        } catch {
          /* ignore */
        } finally {
          client.release();
        }
      }
    }
  };

  (async () => {
    try {
      client = await pool.connect();
      await client.query("select pg_advisory_lock($1,$2)", lockKey);

      const existing = await findIdempotencyRecord({
        route,
        idempotencyKey: rawKey,
        client,
      });

      if (existing) {
        if (existing.request_hash !== requestHash) {
          trackEvent({
            name: "idempotency_conflict",
            properties: { route, requestId, idempotencyKeyHash: keyHash },
          });
          await client.query("select pg_advisory_unlock($1,$2)", lockKey);
          client.release();
          return res.status(409).json({
            code: "idempotency_conflict",
            message: "Idempotency key reused with different payload.",
            requestId,
          });
        }

        trackEvent({
          name: "idempotency_cache_hit",
          properties: { route, requestId, idempotencyKeyHash: keyHash },
        });

        await client.query("select pg_advisory_unlock($1,$2)", lockKey);
        client.release();
        return res
          .status(existing.response_code)
          .json(existing.response_body);
      }

      const wrap = <T extends (...args: any[]) => any>(fn: T): T =>
        ((body: unknown) => {
          if (!res.headersSent && !res.locals.requestTimedOut) {
            res.locals.idempotencyResponseBody = body;
          }
          return fn(body);
        }) as T;

      res.json = wrap(res.json.bind(res));
      res.send = wrap(res.send.bind(res));

      res.on("finish", () => void finalize());
      res.on("close", () => void finalize());

      next();
    } catch (err) {
      if (client) {
        try {
          await client.query("select pg_advisory_unlock($1,$2)", lockKey);
        } catch {
          /* ignore */
        }
        client.release();
      }

      logWarn("idempotency_failed", {
        requestId,
        route,
        error: err instanceof Error ? err.message : "unknown_error",
      });

      if (shouldBypass(err)) return next();
      next(err instanceof Error ? err : new Error("idempotency_failed"));
    }
  })();
}

export function hashIdempotencyKey(
  key: string | null | undefined
): string {
  return sha256(key ?? "missing");
}
