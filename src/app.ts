import express from "express";
import cors from "cors";

import apiRouter from "./api";
import { healthHandler, readyHandler } from "./routes/ready";
import { printRoutes } from "./debug/printRoutes";
import { getPendingMigrations, runMigrations } from "./migrations";
import { shouldRunMigrations } from "./config";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { requestTimeout } from "./middleware/requestTimeout";
import { runStartupConsistencyCheck } from "./startup/consistencyCheck";
import { getStatus, isReady, markNotReady, markReady } from "./startupState";
import "./services/twilio";
import { PORTAL_ROUTE_REQUIREMENTS } from "./routes/routeRegistry";
import { seedAdminUser, seedSecondAdminUser } from "./db/seed";
import { ensureOtpTableExists } from "./db/ensureOtpTable";
import { logError } from "./observability/logger";
import applicationsRoutes from "./routes/applications";
import portalRoutes from "./routes/portal";
import internalRoutes from "./routes/_int";
import { checkDb } from "./db";

type RouteEntry = { method: string; path: string };

type Layer = {
  route?: {
    path: string | string[];
    methods: Record<string, boolean>;
  };
  name?: string;
  handle?: { stack?: Layer[] };
  path?: string;
  regexp?: RegExp & { fast_slash?: boolean };
};

function getLayerPath(layer: Layer): string {
  if (typeof layer.path === "string") {
    return layer.path;
  }

  if (layer.regexp?.fast_slash) {
    return "";
  }

  const source = layer.regexp?.source;
  if (!source) {
    return "";
  }

  if (source === "^\\/?$") {
    return "";
  }

  let path = source
    .replace("^\\/", "/")
    .replace("\\/?(?=\\/|$)", "")
    .replace("(?=\\/|$)", "")
    .replace(/\\\//g, "/")
    .replace(/\$$/, "")
    .replace(/^\^/, "")
    .replace(/\(\?:\(\?=\\\/\|\$\)\)\?/, "")
    .replace(/\?$/, "");

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  return path === "/" ? "" : path;
}

function joinPaths(prefix: string, suffix: string): string {
  const base = prefix === "/" ? "" : prefix;
  const tail = suffix === "/" ? "" : suffix;
  const combined = `${base}${tail}`;
  if (!combined) {
    return "/";
  }
  return combined.startsWith("/") ? combined : `/${combined}`;
}

function addRoute(
  routes: RouteEntry[],
  prefix: string,
  method: string,
  routePath: string
) {
  const fullPath = joinPaths(prefix, routePath);
  routes.push({ method, path: fullPath });
}

function walkStack(stack: Layer[], prefix: string, routes: RouteEntry[]) {
  stack.forEach((layer) => {
    if (layer.route) {
      const paths = Array.isArray(layer.route.path)
        ? layer.route.path
        : [layer.route.path];
      const methods = Object.keys(layer.route.methods);
      methods.forEach((method) => {
        paths.forEach((routePath) =>
          addRoute(routes, prefix, method.toUpperCase(), routePath)
        );
      });
      return;
    }

    if (layer.name === "router" && layer.handle?.stack) {
      const layerPath = getLayerPath(layer);
      const nextPrefix = joinPaths(prefix, layerPath);
      walkStack(layer.handle.stack, nextPrefix, routes);
    }
  });
}

function listMountedRoutes(app: express.Express): RouteEntry[] {
  const routes: RouteEntry[] = [];
  const stack = (app as unknown as { _router?: { stack?: Layer[] } })._router
    ?.stack;
  if (stack) {
    walkStack(stack, "", routes);
  }
  return routes;
}

function assertRoutesMounted(app: express.Express): void {
  const mountedRoutes = listMountedRoutes(app);
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

export function buildApp(): express.Express {
  const app = express();

  app.use(requestId);
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(
    cors({
      origin: "https://staff.boreal.financial",
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );
  app.options("*", cors());
  app.use(requestLogger);
  app.use(requestTimeout);

  app.use("/api/_int", internalRoutes);
  app.get("/health", healthHandler);
  app.get("/ready", readyHandler);

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

  try {
    await ensureOtpTableExists();
  } catch (err) {
    logError("otp_schema_self_heal_failed", { err });
    markNotReady("otp_table_check_failed");
    return;
  }

  const pendingMigrations = await getPendingMigrations();
  if (pendingMigrations.length > 0) {
    markNotReady("pending_migrations");
    return;
  }
  try {
    await runStartupConsistencyCheck();
  } catch (err) {
    logError("startup_consistency_check_failed", { err });
    markNotReady("table_checks_failed");
    return;
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
      const status = getStatus();
      res.status(503).json({
        ok: false,
        code: "service_not_ready",
        reason: status.reason,
      });
      return;
    }
    next();
  });

  app.use("/api/applications", applicationsRoutes);
  app.use("/api/portal", portalRoutes);

  // Ensure API routes are registered before any auth guards are applied.
  app.use("/api", apiRouter);
  app.use("/api", (req, res) => {
    const requestId = res.locals.requestId ?? "unknown";
    res.status(404).json({
      code: "not_found",
      message: "Not Found",
      requestId,
    });
  });
  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const requestId =
      (req as express.Request & { id?: string }).id ?? res.locals.requestId ?? "unknown";
    const explicitStatus =
      typeof (err as { status?: unknown }).status === "number"
        ? (err as { status: number }).status
        : undefined;
    const status = explicitStatus ?? (res.statusCode >= 400 ? res.statusCode : 500);
    const errCode = (err as { code?: unknown }).code;
    const code =
      status >= 500
        ? "internal_error"
        : errCode === "validation_error"
        ? "validation_error"
        : "bad_request";
    const message =
      err instanceof Error && err.message
        ? err.message
        : status >= 500
        ? "Internal server error."
        : "Bad request.";
    const details = (err as { details?: unknown }).details;
    res.status(status).json({
      code,
      message,
      ...(details ? { details } : {}),
      requestId,
    });
  });
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
