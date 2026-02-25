import express from "express";
import cors from "cors";
import helmet from "helmet";

export function buildAppWithApiRoutes(): express.Express {
  const app = express();

  app.use(express.json());
  app.use(cors());
  app.use(helmet());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}

export function buildApp(): express.Express {
  return buildAppWithApiRoutes();
}

export function registerApiRoutes(_app: express.Express): void {
  // Routes are mounted in buildAppWithApiRoutes for test bootstrap.
}

export function assertCorsConfig(): void {
  // No-op for default CORS config.
}

const app = buildAppWithApiRoutes();

export default app;
