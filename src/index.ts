import { buildApp, registerApiRoutes } from "./app";
import { isTestEnvironment } from "./config";
import { assertSchema, pool, waitForDatabaseReady, warmUpDatabase } from "./db";
import { logError, logInfo, logWarn } from "./observability/logger";
import { initializeAppInsights } from "./observability/appInsights";
import { installProcessHandlers } from "./observability/processHandlers";
import { setDbConnected, setSchemaReady } from "./startupState";
import { runStartupConsistencyCheck } from "./startup/consistencyCheck";

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
    logInfo("db_connected");
    await runStartupConsistencyCheck();

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
  logger.info({
    event: "server_listening",
    port: PORT,
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
    process.exit(1);
  }
}, startupWatchdogMs);

server.once("listening", () => {
  clearTimeout(watchdog);
});

server.once("error", () => {
  clearTimeout(watchdog);
});

initializeAppInsights();
installProcessHandlers();

if (!isTestEnvironment()) {
  void logStartupStatus();
}

export { app, server };
