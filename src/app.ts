import express from "express";
import type { Express, NextFunction, Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { registerRoutes } from "./routes";
import { applyMiddleware } from "./middleware/applyMiddleware";
import { logInfo } from "./observability/logger";

function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestIdHeader = req.headers["x-request-id"];
  const requestId =
    typeof requestIdHeader === "string" && requestIdHeader.trim().length > 0
      ? requestIdHeader
      : uuid();

  res.setHeader("x-request-id", requestId);
  (req as Request & { requestId?: string }).requestId = requestId;
  next();
}

export function createApp(): Express {
  const app = express();

  app.use(express.json());
  app.use(requestIdMiddleware);
  applyMiddleware(app);

  app.use((req, res, next) => {
    logInfo("request_started", { method: req.method, path: req.originalUrl });
    res.on("finish", () => {
      logInfo("route_resolved", { method: req.method, path: req.originalUrl, status: res.statusCode });
    });
    next();
  });

  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      requestId: (req as Request & { requestId?: string }).requestId,
    });
  });

  registerRoutes(app);

  app.use((req, res) => {
    res.status(404).json({
      code: "not_found",
      message: "Route not found",
      requestId: (req as Request & { requestId?: string }).requestId,
    });
  });

  app.use((err: any, req: Request & { requestId?: string }, res: Response, _next: NextFunction) => {
    res.status(err?.status || 500).json({
      code: err?.code || "internal_error",
      message: err?.message || "Internal server error",
      requestId: req.requestId,
    });
  });

  return app;
}

export const app = createApp();

export async function buildApp(): Promise<Express> {
  return app;
}

export function buildAppWithApiRoutes(): Express {
  return createApp();
}

export default app;
