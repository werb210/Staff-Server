import { type NextFunction, type Request, type Response } from "express";

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();
  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const requestId = res.locals.requestId ?? "unknown";
    const ip = req.ip ?? "unknown";
    console.info("request_completed", {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ip,
      durationMs,
    });
  });
  next();
}
