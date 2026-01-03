import express from "express";
import internalRoutes from "./routes/internal";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import staffRoutes from "./routes/staff";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import { assertEnv } from "./config";
import { assertSchema, checkDb } from "./db";
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
  app.listen(port, () => {
    console.log(`Server listening on ${port}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error("server_start_failed", err);
    process.exit(1);
  });
}
