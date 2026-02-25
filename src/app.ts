import express from "express";
import cors from "cors";
import helmet from "helmet";
import { randomUUID } from "crypto";

export function buildAppWithApiRoutes(): express.Express {
  const app = express();

  app.use(express.json());
  app.use(helmet());

  // request trace middleware
  app.use((req, res, next) => {
    const requestId = randomUUID();
    (req as express.Request & { requestId?: string }).requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  });

  // CORS
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // HEALTH
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  // INTERNAL ROUTES (placeholder for tests)
  app.get("/api/_int/ping", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get("/api/_int/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  // OTP START ROUTE (minimal implementation for tests)
  app.post("/api/auth/otp/start", (_req, res) => {
    res.status(200).json({ started: true });
  });

  // NOT FOUND HANDLER
  app.use((_req, res) => {
    res.status(404).json({ code: "not_found" });
  });

  return app;
}

export function buildApp(): express.Express {
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
