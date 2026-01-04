import express from "express";
import internalRoutes from "./routes/internal";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import staffRoutes from "./routes/staff";
import applicationsRoutes from "./routes/applications";
import lenderRoutes from "./routes/lender";
import adminRoutes from "./routes/admin";
import reportsRoutes from "./routes/reports";
import reportingRoutes from "./routes/reporting";
import clientRoutes from "./routes/client";
import { requestId } from "./middleware/requestId";
import { requireRequestId } from "./middleware/requireRequestId";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import { assertEnv } from "./config";
import { assertSchema, checkDb, pool } from "./db";
import { assertNoPendingMigrations, runMigrations } from "./migrations";
import { startReportingJobs } from "./modules/reporting/reporting.jobs";
import { startOcrWorker } from "./modules/ocr/ocr.worker";

export function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(requestId);
  app.use(requireRequestId);
  app.use(requestLogger);

  app.use("/api/_int", internalRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/applications", applicationsRoutes);
  app.use("/api/client", clientRoutes);
  app.use("/api/lender", lenderRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/reporting", reportingRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export async function initializeServer(): Promise<void> {
  assertEnv();
  await checkDb();
  if (process.env.RUN_MIGRATIONS_ON_STARTUP === "true") {
    await runMigrations();
  }
  await assertNoPendingMigrations();
  await assertSchema();
}

async function start(): Promise<void> {
  await initializeServer();
  const app = buildApp();
  const port = process.env.PORT || 8080;
  const server = app.listen(port, () => {
    console.log(`Server listening on ${port}`);
  });
  const jobs = startReportingJobs();
  const ocrWorker = startOcrWorker();

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.log(`Received ${signal}, shutting down.`);
    server.close(async (err) => {
      if (err) {
        console.error("server_shutdown_error", err);
        process.exit(1);
      }
      try {
        jobs?.stop();
        ocrWorker?.stop();
        await pool.end();
        process.exit(0);
      } catch (error) {
        console.error("db_shutdown_error", error);
        process.exit(1);
      }
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

if (require.main === module) {
  start().catch((err) => {
    console.error("server_start_failed", err);
    process.exit(1);
  });
}
