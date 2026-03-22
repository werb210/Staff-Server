import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { appInsights } from "../services/appInsights";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = randomUUID();

  (req as Request & { request_id?: string }).request_id = requestId;
  res.setHeader("x-request-id", requestId);

  console.log(`➡️  ${req.method} ${req.originalUrl}`);

  appInsights.trackRequest({
    request_id: requestId,
    method: req.method,
    path: req.path,
  });

  res.on("finish", () => {
    const duration = Date.now() - start;

    console.log(`⬅️  ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);

    appInsights.trackDependency({
      request_id: requestId,
      status: res.statusCode,
    });
  });

  next();
}
