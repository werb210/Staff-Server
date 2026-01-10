import cors from "cors";
import express from "express";

import apiRouter from "./api";
import readyRoutes, { healthHandler, readyHandler } from "./routes/ready";
import { printRoutes } from "./debug/printRoutes";
import { getPendingMigrations, runMigrations } from "./migrations";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { requestTimeout } from "./middleware/requestTimeout";
import { runStartupConsistencyCheck } from "./startup/consistencyCheck";
import { getCorsAllowlist } from "./config/env";
import { getCorsAllowedHeaders } from "./startup/corsValidation";
import { setCriticalServicesReady, setMigrationsState } from "./startupState";

export function buildApp(): express.Express {
  const app = express();
  const corsAllowlist = getCorsAllowlist();
  const allowAnyOrigin = corsAllowlist.includes("*");

  app.use(requestId);
  app.use(requestLogger);
  app.use(requestTimeout);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowAnyOrigin || corsAllowlist.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("cors_origin_not_allowed"));
      },
      credentials: false,
      allowedHeaders: getCorsAllowedHeaders(),
      exposedHeaders: ["x-request-id"],
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", healthHandler);
  app.get("/ready", readyHandler);

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
