import { type NextFunction, type Request, type Response } from "express";
import { AppError } from "./errors";
import { isDbConnectionFailure } from "../dbRuntime";
import { logError } from "../observability/logger";

export type SafeRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export function safeHandler(handler: SafeRequestHandler): SafeRequestHandler {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      const requestId = res.locals.requestId ?? "unknown";
      const isAuthRoute = req.originalUrl.split("?")[0].startsWith("/api/auth/");
      logError("safe_handler_error", {
        requestId,
        route: req.originalUrl,
        userId: req.user?.userId ?? null,
        error: err instanceof Error ? err.message : "unknown_error",
      });
      if (err instanceof AppError || res.headersSent || isDbConnectionFailure(err)) {
        next(err as Error);
        return;
      }
      if (isAuthRoute) {
        res.status(503).json({
          ok: false,
          data: null,
          error: {
            code: "service_unavailable",
            message: "Authentication service unavailable.",
          },
          requestId,
        });
        return;
      }
      res.status(500).json({
        code: "server_error",
        message: "An unexpected error occurred.",
        requestId,
      });
    }
  };
}
