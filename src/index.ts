import appInsights from "applicationinsights";

const appInsightsClient =
  appInsights ?? (require("applicationinsights") as typeof appInsights);

if (!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
  throw new Error("APPLICATIONINSIGHTS_CONNECTION_STRING is missing");
}

appInsightsClient
  .setup(process.env.APPLICATIONINSIGHTS_CONNECTION_STRING)
  .setAutoCollectRequests(true)
  .setAutoCollectDependencies(true)
  .setAutoCollectExceptions(true)
  .setAutoCollectPerformance(true)
  .setAutoCollectConsole(true, true)
  .setSendLiveMetrics(true)
  .start();
console.log("App Insights initialized");

import express from "express";
import cors from "cors";

import apiRouter from "./api";
import { printRoutes } from "./debug/printRoutes";
import { requestContext } from "./middleware/requestContext";
import { notFoundHandler, errorHandler } from "./middleware/errors";
import { checkDb, pool } from "./db";
import { logError, logInfo, logWarn } from "./observability/logger";

const app = express();

app.use((req, _res, next) => {
  console.log("[REQ]", req.method, req.originalUrl);
  next();
});

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
// REQUEST CONTEXT (FIX)
// --------------------
app.use(requestContext);

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
// API ROUTES
// --------------------
app.use("/api", apiRouter);

// --------------------
// FALLTHROUGHS
// --------------------
app.use(notFoundHandler);
app.use(errorHandler);

printRoutes(app);

// --------------------
// BOOT
// --------------------
async function logStartupStatus(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === "pg-mem") {
    logInfo("db_connection_info", {
      host: "pg-mem",
      database: "pg-mem",
      user: "pg-mem",
    });
  } else if (connectionString) {
    try {
      const url = new URL(connectionString);
      logInfo("db_connection_info", {
        host: url.hostname,
        database: url.pathname.replace("/", ""),
        user: url.username || process.env.PGUSER || "unknown",
      });
    } catch (err) {
      logWarn("db_connection_info_parse_failed", {
        error: err instanceof Error ? err.message : "unknown_error",
      });
    }
  } else {
    logInfo("db_connection_info", {
      host: process.env.PGHOST ?? "unknown",
      database: process.env.PGDATABASE ?? "unknown",
      user: process.env.PGUSER ?? "unknown",
    });
  }

  await checkDb();
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
    console.log(`Staff Server running on port ${port}`);
  });
}

void startServer();

export default app;
