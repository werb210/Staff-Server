import { buildApp, registerApiRoutes } from "./app";
import { assertSchema, pool, waitForDatabaseReady, warmUpDatabase } from "./db";
import { logError, logInfo, logWarn } from "./observability/logger";
import { initializeAppInsights } from "./observability/appInsights";
import { installProcessHandlers } from "./observability/processHandlers";
import { setDbConnected, setSchemaReady } from "./startupState";

initializeAppInsights();
installProcessHandlers();

async function logStartupStatus(): Promise<void> {
  await waitForDatabaseReady();
  setDbConnected(true);
  await warmUpDatabase();
  await assertSchema();
  setSchemaReady(true);
  logInfo("db_connected");

  const userCountResult = await pool.query<{ count: number }>(
    "select count(*)::int as count from users"
  );
  const userCount = userCountResult.rows[0]?.count ?? 0;
  if (userCount === 0) {
    logWarn("seed_failure", { userCount });
  } else {
    logInfo("user_count", { userCount });
  }
}

async function startServer(): Promise<void> {
  try {
    await logStartupStatus();
  } catch (err) {
    logError("startup_failed", {
      error: err instanceof Error ? err.message : "unknown_error",
    });
    process.exit(1);
  }

  const app = buildApp();
  registerApiRoutes(app);
  const port = Number(process.env.PORT) || 8080;
  app.listen(port, () => {
    logInfo("startup_complete", { port });
  });
}

void startServer();
