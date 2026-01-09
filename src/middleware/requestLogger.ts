import { type NextFunction, type Request, type Response } from "express";
import { logInfo } from "../observability/logger";
import { trackRequest } from "../observability/appInsights";

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

  const requestId = res.locals.requestId ?? "unknown";
  logInfo("request_started", {
    requestId,
    route: req.originalUrl,
    method: req.method,
    path: req.originalUrl,
    durationMs: 0,
  });

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const requestId = res.locals.requestId ?? "unknown";
    const ip = req.ip ?? "unknown";
    const outcome = res.statusCode >= 400 ? "failure" : "success";
    logInfo("request_completed", {
      requestId,
      route: req.originalUrl,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ip,
      durationMs,
      outcome,
      responseBody: res.locals.responseBody,
    });

    trackRequest({
      name: `${req.method} ${req.originalUrl}`,
      url: `${req.protocol}://${req.get("host") ?? "unknown"}${req.originalUrl}`,
      duration: durationMs,
      resultCode: res.statusCode,
      success: res.statusCode < 500,
      properties: {
        requestId,
        route: req.originalUrl,
        method: req.method,
        outcome,
      },
    });
  });
  next();
}
