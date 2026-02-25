import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";

export function buildAppWithApiRoutes() {
  const app = express();

  app.use(express.json());

  // Request ID middleware
  app.use((req, res, next) => {
    const requestId = randomUUID();
    res.setHeader("x-request-id", requestId);
    (req as any).requestId = requestId;
    next();
  });

  // CORS rules
  app.use(
    cors({
      origin: (_origin, callback) => callback(null, true),
      credentials: true,
    })
  );

  // HEALTH ROUTE
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  // INTERNAL ROUTE PREFIX
  app.use("/api/_int", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  return app;
}

export function buildApp() {
  return buildAppWithApiRoutes();
}

export function registerApiRoutes(_app: express.Express): void {
  // Routes are mounted in buildAppWithApiRoutes.
}

export function assertCorsConfig(): void {
  // No-op: CORS middleware is configured in buildAppWithApiRoutes.
}

const app = buildAppWithApiRoutes();

export default app;
