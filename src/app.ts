import express, { type NextFunction, type Request, type Response } from "express";
import { randomUUID as uuid } from "crypto";
import { registerRoutes } from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { getCorsAllowlist } from "./config/env";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.get("origin");
  const allowlist = new Set(getCorsAllowlist());

  if (origin && allowlist.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }

  if (req.method === "OPTIONS") {
    const requestedMethod = req.get("Access-Control-Request-Method");
    if (requestedMethod) {
      const requestedHeaders = req.get("Access-Control-Request-Headers") ?? "content-type";
      res.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.set("Access-Control-Allow-Headers", requestedHeaders);
      res.status(204).send();
      return;
    }
  }

  next();
}

function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const headerId = req.headers["x-request-id"];
  const requestId = typeof headerId === "string" && headerId.trim().length > 0 ? headerId : uuid();
  res.setHeader("x-request-id", requestId);
  res.locals.requestId = requestId;
  req.requestId = requestId;
  next();
}

function internalRouteGuard(req: Request, res: Response, next: NextFunction): void {
  const origin = req.get("origin");
  if (origin && req.path.startsWith("/api/_int")) {
    return void res.status(403).json({ error: "Forbidden" });
  }
  next();
}

export function createApp(_options?: { test?: boolean }) {
  const app = express();
  app.use(express.json());
  app.use(corsMiddleware);
  app.use(requestIdMiddleware);
  app.use(internalRouteGuard);
  registerRoutes(app);
  app.use((req, res) => {
    res.status(404).json({
      error: "Not found",
      requestId: req.requestId ?? res.locals.requestId ?? "unknown",
    });
  });
  app.use(errorHandler);
  return app;
}

export function buildApp() {
  return createApp();
}

export function buildAppWithApiRoutes() {
  return createApp({ test: process.env.NODE_ENV === "test" });
}

export function registerApiRoutes(app: express.Express) {
  registerRoutes(app);
}

export function assertCorsConfig() {
  return;
}

export default createApp();
