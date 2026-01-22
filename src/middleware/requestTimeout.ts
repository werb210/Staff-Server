import { type NextFunction, type Request, type Response } from "express";
import { cancelDbWork } from "../dbRuntime";
import { getRequestTimeoutMs } from "../config";
import { getRequestDbProcessIds } from "./requestContext";
import { logWarn } from "../observability/logger";
import { trackEvent } from "../observability/appInsights";
import { hashIdempotencyKey } from "./idempotency";

export function requestTimeout(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const timeoutMs = getRequestTimeoutMs();
  const requestId = res.locals.requestId ?? "unknown";
  const route = req.originalUrl;
  const idempotencyKeyHash = hashIdempotencyKey(req.get("idempotency-key"));

  let fired = false;

  const timer = setTimeout(async () => {
    if (fired || res.headersSent) return;
    fired = true;

    const processIds = getRequestDbProcessIds();
    if (processIds.length > 0) {
      await cancelDbWork(processIds);
    }

    logWarn("request_timeout", {
      requestId,
      route,
      durationMs: timeoutMs,
      failure_reason: "request_timeout",
    });

    trackEvent({
      name: "request_timeout",
      properties: {
        route,
        requestId,
        idempotencyKeyHash,
      },
    });

    res.status(504).json({
      code: "gateway_timeout",
      message: "Request timed out.",
      requestId,
    });

    res.locals.requestTimedOut = true;
  }, timeoutMs);

  const clear = (): void => {
    if (!fired) {
      clearTimeout(timer);
    }
  };

  res.on("finish", clear);
  res.on("close", clear);

  next();
}
