import { buildApp } from "./app";
import { warmUpDatabase, pool } from "./db";
import { logError, logInfo, logWarn } from "./observability/logger";
import { initializeAppInsights } from "./observability/appInsights";

initializeAppInsights();

const app = buildApp();

async function logStartupStatus(): Promise<void> {
  await warmUpDatabase();
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

  const port = Number(process.env.PORT) || 8080;
  app.listen(port, () => {
    logInfo("startup_complete", { port });
  });
}

void startServer();

export default app;
