import { type NextFunction, type Request, type Response } from "express";
import { logInfo } from "../observability/logger";
import { trackRequest } from "../observability/appInsights";
import { getRequestContext } from "../observability/requestContext";

const SENSITIVE_FIELD_PATTERN = /(token|password|secret)/i;

function redact(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(redact);
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(
      value as Record<string, unknown>
    )) {
      out[key] = SENSITIVE_FIELD_PATTERN.test(key)
        ? "[redacted]"
        : redact(entry);
    }
    return out;
  }

  return value;
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();
  const requestId = res.locals.requestId ?? "unknown";

  const origin = req.get("origin");
  const userAgent = req.get("user-agent");
  const authorizationState = req.get("authorization") ? "PRESENT" : "MISSING";
  const ip = req.ip ?? "unknown";
  const context = getRequestContext();

  if (context?.sqlTraceEnabled) {
    logInfo("sql_trace_request", {
      requestId,
      method: req.method,
      path: context.path,
    });
  }

  logInfo("request_started", {
    requestId,
    method: req.method,
    route: req.originalUrl,
    origin,
    userAgent,
    authorization: authorizationState,
    ip,
  });

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const outcome = res.statusCode >= 400 ? "failure" : "success";

    logInfo("request_completed", {
      requestId,
      route: req.originalUrl,
      method: req.method,
      status: res.statusCode,
      ip,
      durationMs,
      outcome,
      ...(res.locals.responseBody
        ? { responseBody: redact(res.locals.responseBody) }
        : {}),
    });

    logInfo("route_resolved", {
      requestId,
      method: req.method,
      originalUrl: req.originalUrl,
      routePath: req.route?.path ?? null,
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
