import express from "express";
import internalRoutes from "./routes/internal";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import staffRoutes from "./routes/staff";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import { assertEnv } from "./config";
import { assertSchema, checkDb, pool } from "./db";
import { assertNoPendingMigrations, runMigrations } from "./migrations";

export function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(requestId);
  app.use(requestLogger);

  app.use("/api/_int", internalRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/staff", staffRoutes);

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
