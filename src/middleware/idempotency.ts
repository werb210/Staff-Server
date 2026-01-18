import { type NextFunction, type Request, type Response } from "express";
import { createHash } from "crypto";
import { type PoolClient } from "pg";
import { pool } from "../db";
import { isDbConnectionFailure, isPgMemRuntime, isTestEnvironment } from "../dbRuntime";
import { AppError } from "./errors";
import { isProductionEnvironment } from "../config";
import { createIdempotencyRecord, findIdempotencyRecord } from "../modules/idempotency/idempotency.repo";
import { logWarn } from "../observability/logger";
import { trackEvent } from "../observability/appInsights";
import { setRequestIdempotencyKeyHash } from "./requestContext";

type IdempotencyContext = {
  key: string;
  hash: string;
  route: string;
  requestHash: string;
  lockClient: PoolClient | null;
  lockKey: [number, number] | null;
  releaseLock: (() => void) | null;
  shouldStore: boolean;
};

const IDEMPOTENCY_HEADER = "idempotency-key";
const inMemoryLocks = new Map<string, Promise<void>>();

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function createAdvisoryLockKey(value: string): [number, number] {
  const hash = createHash("sha256").update(value).digest();
  return [hash.readInt32BE(0), hash.readInt32BE(4)];
}

async function acquireInMemoryLock(key: string): Promise<() => void> {
  const previous = inMemoryLocks.get(key) ?? Promise.resolve();
  let release: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  inMemoryLocks.set(key, previous.then(() => current));
  await previous;
  return () => {
    release();
    if (inMemoryLocks.get(key) === current) {
      inMemoryLocks.delete(key);
    }
  };
}

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${entries.join(",")}}`;
}

function getRequestRoute(req: Request): string {
  return req.path;
}

function emitTelemetry(event: string, params: { route: string; requestId: string; keyHash: string }): void {
  trackEvent({
    name: event,
    properties: {
      route: params.route,
      requestId: params.requestId,
      idempotencyKeyHash: params.keyHash,
    },
  });
}

function isIdempotencySchemaError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const code = (error as { code?: string }).code;
  if (code === "42P01" || code === "42703" || code === "42P07") {
    return true;
  }
  const message = error.message.toLowerCase();
  return message.includes("idempotency_keys") && (
    message.includes("does not exist") ||
    message.includes("undefined") ||
    message.includes("column") ||
    message.includes("relation")
  );
}

function shouldBypassIdempotency(error: unknown): boolean {
  return isDbConnectionFailure(error) || isIdempotencySchemaError(error);
}

export function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const route = getRequestRoute(req);
  const isAuthRoute = route.startsWith("/api/auth/") || route.startsWith("/auth/");
  if (isAuthRoute) {
    next();
    return;
  }

  const method = req.method.toUpperCase();
  const enforceMethods = ["POST", "PUT", "PATCH", "DELETE"];
  if (!enforceMethods.includes(method)) {
    next();
    return;
  }

  const key = req.get(IDEMPOTENCY_HEADER);
  const trimmedKey = key ? key.trim() : "";
  if (!trimmedKey) {
    if (!isProductionEnvironment()) {
      logWarn("idempotency_key_missing", {
        route,
        method: req.method,
        requestId: res.locals.requestId ?? "unknown",
      });
    }
    next(new AppError("missing_idempotency_key", "Idempotency-Key header is required.", 400));
    return;
  }
  if (trimmedKey.length > 128) {
    next(new AppError("idempotency_key_too_long", "Idempotency-Key is too long.", 400));
    return;
  }

  if (res.locals.idempotencyKeyGenerated) {
    next();
    return;
  }

  const requestId = res.locals.requestId ?? "unknown";
  const requestHash = hashValue(stableStringify(req.body ?? {}));
  const keyHash = hashValue(trimmedKey);
  setRequestIdempotencyKeyHash(keyHash);

  if (isTestEnvironment() && req.get("authorization")) {
    next();
    return;
  }
  const lockIdentifier = `${route}:${trimmedKey}`;
  const lockKey = createAdvisoryLockKey(lockIdentifier);

  let context: IdempotencyContext | null = null;
  let resolved = false;

  const finalize = async (): Promise<void> => {
    if (!context || !context.shouldStore || resolved) {
      return;
    }
    resolved = true;
    const responseBody = res.locals.idempotencyResponseBody ?? null;
    const shouldPersist = res.statusCode < 500;
    if (!shouldPersist) {
      if (context.releaseLock) {
        context.releaseLock();
      }
      if (context.lockClient && context.lockKey) {
        try {
          await context.lockClient.query("select pg_advisory_unlock($1, $2)", context.lockKey);
        } catch {
          // ignore unlock errors
        }
        context.lockClient.release();
      }
      return;
    }
    try {
      await createIdempotencyRecord({
        idempotencyKey: context.key,
        route: context.route,
        method: req.method ?? "POST",
        requestHash: context.requestHash,
        responseCode: res.statusCode,
        responseBody,
        client: context.lockClient ?? undefined,
      });
    } catch (error) {
      logWarn("idempotency_record_failed", {
        requestId,
        route,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    } finally {
      if (context.releaseLock) {
        context.releaseLock();
      }
      if (context.lockClient && context.lockKey) {
        try {
          await context.lockClient.query("select pg_advisory_unlock($1, $2)", context.lockKey);
        } catch {
          // ignore unlock errors
        }
        context.lockClient.release();
      }
    }
  };

  const handle = async (): Promise<void> => {
    let lockClient: PoolClient | null = null;
    let releaseLock: (() => void) | null = null;
    try {
      const useInMemoryLock = isPgMemRuntime();
      lockClient = useInMemoryLock ? null : await pool.connect();
      releaseLock = useInMemoryLock ? await acquireInMemoryLock(lockIdentifier) : null;
      if (lockClient) {
        await lockClient.query("select pg_advisory_lock($1, $2)", lockKey);
      }
      let existing = null;
      try {
        existing = await findIdempotencyRecord({
          route,
          idempotencyKey: trimmedKey,
          client: lockClient ?? undefined,
        });
      } catch (error) {
        if (isAuthRoute || shouldBypassIdempotency(error)) {
          logWarn("idempotency_bypassed", {
            requestId,
            route,
            error: error instanceof Error ? error.message : "unknown_error",
          });
          if (releaseLock) {
            releaseLock();
          }
          if (lockClient) {
            await lockClient.query("select pg_advisory_unlock($1, $2)", lockKey);
            lockClient.release();
          }
          next();
          return;
        }
        throw error;
      }
      if (existing) {
        if (existing.request_hash && existing.request_hash !== requestHash) {
          emitTelemetry("idempotency_conflict", { route, requestId, keyHash });
          if (releaseLock) {
            releaseLock();
          }
          if (lockClient) {
            await lockClient.query("select pg_advisory_unlock($1, $2)", lockKey);
            lockClient.release();
          }
          res.status(409).json({
            code: "idempotency_conflict",
            message: "Idempotency key reused with different payload.",
            requestId,
          });
          return;
        }
        emitTelemetry("idempotency_cache_hit", { route, requestId, keyHash });
        emitTelemetry("duplicate_submission_blocked", { route, requestId, keyHash });
        if (releaseLock) {
          releaseLock();
        }
        if (lockClient) {
          await lockClient.query("select pg_advisory_unlock($1, $2)", lockKey);
          lockClient.release();
        }
        res.status(existing.response_code).json(existing.response_body);
        return;
      }

      context = {
        key: trimmedKey,
        hash: keyHash,
        route,
        requestHash,
        lockClient,
        lockKey,
        releaseLock,
        shouldStore: true,
      };

      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);
      res.json = ((body: unknown) => {
        if (res.headersSent || res.locals.requestTimedOut) {
          return res;
        }
        res.locals.idempotencyResponseBody = body;
        return originalJson(body);
      }) as typeof res.json;
      res.send = ((body: unknown) => {
        if (res.headersSent || res.locals.requestTimedOut) {
          return res;
        }
        res.locals.idempotencyResponseBody = body;
        return originalSend(body);
      }) as typeof res.send;

      res.on("finish", () => {
        void finalize();
      });
      res.on("close", () => {
        void finalize();
      });

      next();
    } catch (error) {
      if (releaseLock) {
        releaseLock();
      }
      if (lockClient) {
        try {
          await lockClient.query("select pg_advisory_unlock($1, $2)", lockKey);
        } catch {
          // ignore unlock errors
        }
        lockClient.release();
      }
      logWarn("idempotency_lock_failed", {
        requestId,
        route,
        error: error instanceof Error ? error.message : "unknown_error",
      });
      if (isAuthRoute || shouldBypassIdempotency(error)) {
        logWarn("idempotency_bypassed", {
          requestId,
          route,
          error: error instanceof Error ? error.message : "unknown_error",
        });
        next();
        return;
      }
      next(error instanceof Error ? error : new Error("idempotency_lock_failed"));
    }
  };

  void handle();
}

export function hashIdempotencyKey(key: string | null | undefined): string {
  if (!key) {
    return hashValue("missing");
  }
  return hashValue(key);
}
