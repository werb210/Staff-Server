import express from "express";

import apiRouter from "./api";
import readyRoutes, { healthHandler } from "./routes/ready";
import { printRoutes } from "./debug/printRoutes";
import { getPendingMigrations, runMigrations } from "./migrations";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { requestTimeout } from "./middleware/requestTimeout";
import { runStartupConsistencyCheck } from "./startup/consistencyCheck";
import { setCriticalServicesReady, setMigrationsState } from "./startupState";

const corsAllowlist = new Set([
  "https://staff.boreal.financial",
  "http://localhost:5173",
]);
const corsAllowedHeaders = ["Content-Type", "Authorization", "Idempotency-Key"];
const corsAllowedMethods = ["POST", "OPTIONS"];

function corsMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const origin = req.headers.origin;
  if (origin) {
    if (!corsAllowlist.has(origin)) {
      res.status(403).json({ code: "cors_origin_not_allowed" });
      return;
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      corsAllowedMethods.join(", ")
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      corsAllowedHeaders.join(", ")
    );
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
}

export function buildApp(): express.Express {
  const app = express();

  app.use(corsMiddleware);
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use(requestId);
  app.use(requestLogger);
  app.use(requestTimeout);

  app.get("/health", healthHandler);
  app.get("/ready", healthHandler);
  app.get("/__boot", (req, res) => {
    const appPort = req.app.get("port");
    res.status(200).json({
      pid: process.pid,
      uptime: process.uptime(),
      port: typeof appPort === "number" ? appPort : Number(process.env.PORT ?? 8080),
      nodeVersion: process.version,
      envKeys: Object.keys(process.env).sort(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/_int", readyRoutes);

  return app;
}

export async function initializeServer(): Promise<void> {
  await runMigrations();
  const pendingMigrations = await getPendingMigrations();
  setMigrationsState(pendingMigrations);
  await runStartupConsistencyCheck();
  setCriticalServicesReady(true);
}

export function registerApiRoutes(app: express.Express): void {
  // Ensure API routes are registered before any auth guards are applied.
  app.use("/api", apiRouter);
  if (process.env.PRINT_ROUTES === "true") {
    printRoutes(app);
  }
}

export function buildAppWithApiRoutes(): express.Express {
  const app = buildApp();
  registerApiRoutes(app);
  return app;
}
