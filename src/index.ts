import { buildApp, registerApiRoutes } from "./app";
import { isTestEnvironment } from "./config";
import { assertSchema, pool, waitForDatabaseReady, warmUpDatabase } from "./db";
import { logError, logInfo, logWarn } from "./observability/logger";
import { initializeAppInsights } from "./observability/appInsights";
import { installProcessHandlers } from "./observability/processHandlers";
import { setCriticalServicesReady, setDbConnected, setMigrationsState, setSchemaReady } from "./startupState";
import { runStartupConsistencyCheck } from "./startup/consistencyCheck";
import { validateCorsConfig } from "./startup/corsValidation";
import { getPendingMigrations } from "./migrations";

const logger = {
  info: (fields: { event: string; [key: string]: unknown }): void => {
    const { event, ...rest } = fields;
    logInfo(event, rest);
  },
};

async function logStartupStatus(): Promise<void> {
  try {
    await waitForDatabaseReady();
    setDbConnected(true);
    await warmUpDatabase();
    await assertSchema();
    setSchemaReady(true);
    const pendingMigrations = await getPendingMigrations();
    setMigrationsState(pendingMigrations);
    logInfo("db_connected");
    await runStartupConsistencyCheck();
    setCriticalServicesReady(true);

    const userCountResult = await pool.query<{ count: number }>(
      "select count(*)::int as count from users"
    );
    const userCount = userCountResult.rows[0]?.count ?? 0;
    if (userCount === 0) {
      logWarn("seed_failure", { userCount });
    } else {
      logInfo("user_count", { userCount });
    }
  } catch (err) {
    logError("startup_failed", {
      error: err instanceof Error ? err.message : "unknown_error",
    });
  }
}

const app = buildApp();
registerApiRoutes(app);
const PORT = Number(process.env.PORT ?? 8080);

const server = app.listen(PORT, "0.0.0.0", () => {
  const address = server.address();
  const boundPort = typeof address === "object" && address ? address.port : PORT;
  app.set("port", boundPort);
  console.log("SERVER_LISTENING");
  logger.info({
    event: "server_listening",
    port: boundPort,
    pid: process.pid,
  });
});

const startupWatchdogMs = Number(process.env.STARTUP_WATCHDOG_MS ?? 15000);
const watchdog = setTimeout(() => {
  if (!server.listening) {
    logError("startup_timeout", {
      message: "Server did not start listening before watchdog timeout.",
      timeoutMs: startupWatchdogMs,
    });
  }
}, startupWatchdogMs);

server.once("listening", () => {
  clearTimeout(watchdog);
});

server.once("error", () => {
  clearTimeout(watchdog);
});

function handleStartupException(error: unknown, context: string): void {
  const err = error instanceof Error ? error : new Error(String(error));
  logError("startup_exception", {
    context,
    error: err.message,
    stack: err.stack,
  });
}

function safeStartupStep(context: string, action: () => void): void {
  try {
    action();
  } catch (error) {
    handleStartupException(error, context);
  }
}

safeStartupStep("cors_validation", () => {
  if (!isTestEnvironment()) {
    validateCorsConfig();
  }
});

safeStartupStep("app_insights_init", () => {
  initializeAppInsights();
});

safeStartupStep("process_handlers", () => {
  installProcessHandlers();
});

safeStartupStep("startup_status", () => {
  if (!isTestEnvironment()) {
    void logStartupStatus().catch((error) => handleStartupException(error, "startup_status_async"));
  }
});

export { app, server };
