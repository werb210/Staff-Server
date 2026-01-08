import { type NextFunction, type Request, type Response } from "express";
import { logInfo } from "../observability/logger";

const SENSITIVE_FIELD_PATTERN = /(token|password|secret)/i;

function redactSensitiveFields(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitiveFields(entry));
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, entryValue]) => {
        if (SENSITIVE_FIELD_PATTERN.test(key)) {
          return [key, "[redacted]"];
        }
        return [key, redactSensitiveFields(entryValue)];
      }
    );
    return Object.fromEntries(entries);
  }

  return value;
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();
  res.locals.requestStart = start;
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    res.locals.responseBody = redactSensitiveFields(body);
    return originalJson(body);
  };

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const requestId = res.locals.requestId ?? "unknown";
    const ip = req.ip ?? "unknown";
    logInfo("request_completed", {
      requestId,
      route: req.originalUrl,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ip,
      durationMs,
      responseBody: res.locals.responseBody,
    });
  });
  next();
}
