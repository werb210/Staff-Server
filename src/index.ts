import express from "express";
import cors from "cors";

import apiRouter from "./api";
import { assertEnv } from "./config";
import { assertSchema, checkDb, logBackupStatus } from "./db";
import { printRoutes } from "./debug/printRoutes";
import { assertNoPendingMigrations, runMigrations } from "./migrations";
import { assertAuthSubsystem } from "./modules/auth/auth.service";
import { initializeAppInsights } from "./observability/appInsights";

export function buildApp(): express.Express {
  const app = express();

  // --------------------
  // Core middleware
  // --------------------
  app.use(
    cors({
      origin: true,
      credentials: false,
      allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
      exposedHeaders: ["x-request-id"],
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // --------------------
  // Health (must be JSON)
  // --------------------
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/", (_req, res) => {
    res.json({ status: "ok" });
  });

  // --------------------
  // API ROUTES (FIRST)
  // --------------------
  app.use("/api", apiRouter);

  printRoutes(app);

  return app;
}

export async function initializeServer(): Promise<void> {
  initializeAppInsights();
  assertEnv();
  assertAuthSubsystem();
  await checkDb();
  await runMigrations();
  await assertNoPendingMigrations();
  await assertSchema();
  await logBackupStatus();
}

const app = buildApp();

if (require.main === module) {
  initializeServer().then(() => {
    const port = Number(process.env.PORT) || 8080;
    app.listen(port, () => {
      console.log(`Staff Server running on port ${port}`);
    });
  });
}

export default app;
