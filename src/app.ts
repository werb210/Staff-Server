import express from "express";
import cors from "cors";

import { healthHandler, readyHandler } from "./routes/ready";
import { listRoutes, printRoutes } from "./debug/printRoutes";
import { getPendingMigrations, runMigrations } from "./migrations";
import {
  isTestEnvironment,
  shouldRunMigrations,
  getCorsAllowlistConfig,
  getRequestBodyLimit,
} from "./config";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { requestTimeout } from "./middleware/requestTimeout";
import { runStartupConsistencyCheck } from "./startup/consistencyCheck";
import {
  getStatus as getStartupStatus,
  isReady,
  markNotReady,
  markReady,
} from "./startupState";
import "./services/twilio";
import { PORTAL_ROUTE_REQUIREMENTS, API_ROUTE_MOUNTS } from "./routes/routeRegistry";
import { seedAdminUser, seedBaselineLenders, seedSecondAdminUser } from "./db/seed";
import { ensureOtpTableExists } from "./db/ensureOtpTable";
import { logError, logWarn } from "./observability/logger";
import { checkDb, initializeTestDatabase } from "./db";
import { enforceSecureCookies, requireHttps } from "./middleware/security";
import { idempotencyMiddleware } from "./middleware/idempotency";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import authRoutes from "./routes/auth";
import lendersRoutes from "./routes/lenders";
import lenderProductsRoutes from "./routes/lenderProducts";
import applicationsRoutes from "./routes/applications";

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
  const allowlist = new Set(getCorsAllowlistConfig());
  allowlist.add("https://staff.boreal.financial");
  return {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowlist.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key"],
    optionsSuccessStatus: 204,
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
  try {
    await seedBaselineLenders();
  } catch (err) {
    logWarn("baseline_lenders_seed_skipped", { err });
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

  app.use("/api", requireHttps, enforceSecureCookies, idempotencyMiddleware);

  const explicitMounts = [
    { path: "/auth", router: authRoutes },
    { path: "/lenders", router: lendersRoutes },
    { path: "/lender-products", router: lenderProductsRoutes },
    { path: "/applications", router: applicationsRoutes },
  ];
  const explicitPaths = new Set(explicitMounts.map((entry) => entry.path));
  explicitMounts.forEach((entry) => {
    app.use(`/api${entry.path}`, entry.router);
  });
  API_ROUTE_MOUNTS.filter((entry) => !explicitPaths.has(entry.path)).forEach(
    (entry) => {
      app.use(`/api${entry.path}`, entry.router);
    }
  );

  app.use("/api", notFoundHandler);
  app.use("/api", errorHandler);

  const mountedRoutes = listRoutes(app);
  printRoutes(app);
  if (process.env.PRINT_ROUTES === "true") {
    console.log(mountedRoutes.map((route) => `${route.method} ${route.path}`).join("\n"));
  }
  assertRoutesMounted(app);
}

export function buildAppWithApiRoutes(): express.Express {
  const app = buildApp();
  registerApiRoutes(app);
  return app;
}
