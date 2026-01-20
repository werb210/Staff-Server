import { type NextFunction, type Request, type Response } from "express";
import { logInfo } from "../observability/logger";

export function routeResolutionLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.on("finish", () => {
    const requestId = res.locals.requestId ?? "unknown";
    const matchedRoute = req.route?.path ?? "UNMATCHED";
    const routerBase = req.baseUrl || undefined;
    logInfo("route_resolved", {
      requestId,
      method: req.method,
      originalUrl: req.originalUrl,
      matchedRoute,
      routerBase,
    });
  });
  next();
}
