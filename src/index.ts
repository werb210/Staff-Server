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
import { getPendingMigrations, runMigrations } from "./migrations";
import { startReportingJobs } from "./modules/reporting/reporting.jobs";
import { startOcrWorker } from "./modules/ocr/ocr.worker";
import {
  setConfigLoaded,
  setDbConnected,
  setMigrationsState,
  setSchemaReady,
} from "./startupState";

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
  let configReady = false;
  try {
    assertEnv();
    configReady = true;
    console.info("config_loaded");
  } catch (error) {
    console.warn("config_invalid", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
  } finally {
    setConfigLoaded(configReady);
  }

  const maxAttemptsRaw = Number(process.env.DB_CONNECT_RETRIES ?? "5");
  const delayMsRaw = Number(process.env.DB_CONNECT_RETRY_DELAY_MS ?? "2000");
  const maxAttempts =
    Number.isFinite(maxAttemptsRaw) && maxAttemptsRaw > 0
      ? Math.floor(maxAttemptsRaw)
      : 5;
  const delayMs =
    Number.isFinite(delayMsRaw) && delayMsRaw > 0
      ? Math.floor(delayMsRaw)
      : 2000;
  let connected = false;
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await checkDb();
      connected = true;
      break;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  setDbConnected(connected);
  if (!connected) {
    throw new Error(
      `db_connection_failed:${lastError instanceof Error ? lastError.message : "unknown_error"}`
    );
  }
  console.info("db_connected");

  if (process.env.RUN_MIGRATIONS_ON_STARTUP === "true") {
    try {
      await runMigrations();
    } catch (error) {
      console.error("migrations_run_failed", {
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }

  try {
    const pending = await getPendingMigrations();
    setMigrationsState(pending);
    if (pending.length > 0) {
      console.warn("pending_migrations", { pending });
    }
  } catch (error) {
    setMigrationsState(["unknown"]);
    console.error("migrations_check_failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }

  try {
    await assertSchema();
    setSchemaReady(true);
  } catch (error) {
    setSchemaReady(false);
    console.error("schema_check_failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

async function start(): Promise<void> {
  await initializeServer();
  const app = buildApp();
  const port = process.env.PORT || 8080;
  const server = app.listen(port, () => {
    console.info("server_listening", { port });
  });
  server.on("error", (error) => {
    console.error("server_bind_failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    process.exit(1);
  });
  let jobs: ReturnType<typeof startReportingJobs> | null = null;
  let ocrWorker: ReturnType<typeof startOcrWorker> | null = null;
  try {
    jobs = startReportingJobs();
  } catch (error) {
    console.error("reporting_jobs_start_failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }
  try {
    ocrWorker = startOcrWorker();
  } catch (error) {
    console.error("ocr_worker_start_failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }

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
