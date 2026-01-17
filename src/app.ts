import express from "express";
import cors from "cors";

import apiRouter from "./api";
import { healthHandler, readyHandler } from "./routes/ready";
import { listRoutes, printRoutes } from "./debug/printRoutes";
import { getPendingMigrations, runMigrations } from "./migrations";
import {
  isTestEnvironment,
  shouldRunMigrations,
  getCorsAllowlistConfig,
  getRequestBodyLimit,
  isProductionEnvironment,
} from "./config";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { requestTimeout } from "./middleware/requestTimeout";
import { runStartupConsistencyCheck } from "./startup/consistencyCheck";
import { getStatus as getStartupStatus, isReady, markNotReady, markReady } from "./startupState";
import "./services/twilio";
import { PORTAL_ROUTE_REQUIREMENTS } from "./routes/routeRegistry";
import { seedAdminUser, seedSecondAdminUser } from "./db/seed";
import { ensureOtpTableExists } from "./db/ensureOtpTable";
import { logError, logWarn } from "./observability/logger";
import internalRoutes from "./routes/_int";
import { checkDb, initializeTestDatabase } from "./db";
import { getStatus as getErrorStatus, isHttpishError } from "./helpers/errors";

function assertRoutesMounted(app: express.Express): void {
  const mountedRoutes = listRoutes(app);
  const mountedSet = new Set(
    mountedRoutes.map((route) => `${route.method} ${route.path}`)
  );
  const missing = PORTAL_ROUTE_REQUIREMENTS.filter(
    (route) => !mountedSet.has(`${route.method} ${route.path}`)
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing API routes: ${missing
        .map((route) => `${route.method} ${route.path}`)
        .join(", ")}`
    );
  }
}

function buildCorsOptions(): cors.CorsOptions {
  const allowlist = getCorsAllowlistConfig();
  return {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowlist.includes("*") || allowlist.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Idempotency-Key",
      "X-Request-Id",
    ],
  };
}

export function buildApp(): express.Express {
  const app = express();

  app.use(requestId);
  app.use(express.json({ limit: getRequestBodyLimit() }));
  app.use(express.urlencoded({ extended: true }));
  const corsOptions = buildCorsOptions();
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));
  app.use(requestLogger);
  app.use(requestTimeout);

  app.use("/api/_int", internalRoutes);
  app.get("/api/health", healthHandler);
  app.get("/api/ready", readyHandler);
  app.get("/health", healthHandler);
  app.get("/ready", readyHandler);
  app.get("/__boot", (_req, res) => {
    res.status(200).json({
      pid: process.pid,
      port: app.get("port") ?? null,
      envKeys: Object.keys(process.env ?? {}),
    });
  });

  return app;
}

export async function initializeServer(): Promise<void> {
  markNotReady("initializing");
  const hasDatabase =
    process.env.DATABASE_URL === "pg-mem" || Boolean(process.env.DATABASE_URL);
  if (!hasDatabase) {
    markNotReady("database_not_configured");
    return;
  }

  if (isTestEnvironment()) {
    await initializeTestDatabase();
  }

  try {
    await checkDb();
  } catch (err) {
    logError("startup_db_check_failed", { err });
    markNotReady("db_unavailable");
    return;
  }

  if (shouldRunMigrations()) {
    try {
      await runMigrations();
      await seedAdminUser();
      await seedSecondAdminUser();
    } catch (err) {
      logError("startup_migrations_failed", { err });
      markNotReady("migrations_failed");
      return;
    }
  }

  if (!isTestEnvironment()) {
    try {
      await ensureOtpTableExists();
    } catch (err) {
      logError("otp_schema_self_heal_failed", { err });
      markNotReady("otp_table_check_failed");
      return;
    }
  }

  const pendingMigrations = await getPendingMigrations();
  if (pendingMigrations.length > 0) {
    markNotReady("pending_migrations");
    return;
  }
  if (!isTestEnvironment()) {
    try {
      await runStartupConsistencyCheck();
    } catch (err) {
      logWarn("startup_consistency_check_skipped", { err });
    }
  }
  markReady();
}

export function registerApiRoutes(app: express.Express): void {
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/_int")) {
      next();
      return;
    }
    const shouldGate =
      req.path.startsWith("/api/portal") || req.path.startsWith("/api/applications");
    if (!shouldGate) {
      next();
      return;
    }
    if (!isReady()) {
      const status = getStartupStatus();
      res.status(503).json({
        ok: false,
        code: "service_not_ready",
        reason: status.reason,
      });
      return;
    }
    next();
  });

  // Ensure API routes are registered before any auth guards are applied.
  app.use("/api", apiRouter);
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      const requestId =
        (req as express.Request & { id?: string }).id ??
        res.locals.requestId ??
        "unknown";
      const status = getErrorStatus(err);
      const errCode =
        isHttpishError(err) && typeof err.code === "string" ? err.code : undefined;
      const code =
        status >= 500
          ? "internal_error"
          : errCode === "validation_error"
          ? "validation_error"
          : errCode ?? "bad_request";
      const shouldExposeMessage = !isProductionEnvironment() || status < 500;
      const message =
        shouldExposeMessage && err instanceof Error && err.message
          ? err.message
          : status >= 500
          ? "Internal server error."
          : "Bad request.";
      const details =
        isHttpishError(err) && "details" in err
          ? (err as { details?: unknown }).details
          : undefined;
      res.status(status).json({
        code,
        message,
        ...(details ? { details } : {}),
        requestId,
      });
    }
  );
  if (process.env.PRINT_ROUTES === "true") {
    printRoutes(app);
  }
  assertRoutesMounted(app);
}

export function buildAppWithApiRoutes(): express.Express {
  const app = buildApp();
  registerApiRoutes(app);
  return app;
}
