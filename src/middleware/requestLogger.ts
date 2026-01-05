import { type NextFunction, type Request, type Response } from "express";
import { logInfo } from "../observability/logger";

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();
  res.locals.requestStart = start;
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
    });
  });
  next();
}
