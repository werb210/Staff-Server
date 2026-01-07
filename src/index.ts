import express from "express";
import cors from "cors";

import {
  assertEnv,
  isProductionEnvironment,
  isTestEnvironment,
  shouldRunMigrations,
} from "./config";
import { initializeAppInsights } from "./observability/appInsights";
import { checkDb } from "./db";
import { runMigrations } from "./migrations";

import authRoutes from "./routes/auth";
import staffRoutes from "./routes/staff";
import adminRoutes from "./routes/admin";
import applicationRoutes from "./routes/applications";
import lenderRoutes from "./routes/lender";
import clientRoutes from "./routes/client";
import reportingRoutes from "./routes/reporting";
import reportRoutes from "./routes/reports";

import { notFoundHandler, errorHandler } from "./middleware/errors";

export type AppConfig = {
  port: number;
};

export const defaultConfig: AppConfig = {
  port: Number.isFinite(Number(process.env.PORT))
    ? Number(process.env.PORT)
    : 8080,
};

export function buildApp(config = defaultConfig): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // ===============================
  // HEALTH
  // ===============================
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // ===============================
  // API ROUTES (ONLY)
  // ===============================
  app.use("/api/auth", authRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/applications", applicationRoutes);
  app.use("/api/lender", lenderRoutes);
  app.use("/api/client", clientRoutes);
  app.use("/api/reporting", reportingRoutes);
  app.use("/api/reports", reportRoutes);

  // ===============================
  // HARD API 404 (NO HTML EVER)
  // ===============================
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  // ===============================
  // ERROR HANDLING
  // ===============================
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export async function initializeServer(): Promise<void> {
  assertEnv();
  initializeAppInsights();
  await checkDb();

  if (isProductionEnvironment() && shouldRunMigrations()) {
    await runMigrations();
  }

  const app = buildApp(defaultConfig);

  const server = app.listen(defaultConfig.port, () => {
    console.log(`Staff Server listening on port ${defaultConfig.port}`);
  });

  if (isTestEnvironment()) {
    server.unref();
  }
}

if (require.main === module) {
  void initializeServer();
}
