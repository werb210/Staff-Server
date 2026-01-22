import express from "express";
import cors from "cors";

import { healthHandler, readyHandler } from "./routes/ready";
import { listRoutes, printRoutes } from "./debug/printRoutes";
import { getCorsAllowlistConfig, getRequestBodyLimit } from "./config";
import { requestContext } from "./middleware/requestContext";
import { requestLogger } from "./middleware/requestLogger";
import { requestTimeout } from "./middleware/requestTimeout";
import { routeResolutionLogger } from "./middleware/routeResolutionLogger";
import {
  getStatus as getStartupStatus,
  isReady,
  markNotReady,
  markReady,
} from "./startupState";
import "./startup/envValidation";
import "./services/twilio";
import { PORTAL_ROUTE_REQUIREMENTS, API_ROUTE_MOUNTS } from "./routes/routeRegistry";
import { checkDb } from "./db";
import { requireHttps, securityHeaders } from "./middleware/security";
import { idempotencyMiddleware } from "./middleware/idempotency";
import { ensureIdempotencyKey } from "./middleware/idempotencyKey";
import { notFoundHandler } from "./middleware/errors";
import { errorHandler } from "./middleware/errorHandler";
import { logError } from "./observability/logger";
import authRoutes from "./routes/auth";
import lendersRoutes from "./routes/lenders";
import lenderProductsRoutes from "./routes/lenderProducts";
import applicationsRoutes from "./routes/applications";
import internalRoutes from "./routes/_int";

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
  const portalOrigin = "https://staff.boreal.financial";
  const portalSecondaryOrigin = "https://portal.boreal.financial";
  allowlist.add(portalOrigin);
  allowlist.add(portalSecondaryOrigin);
  allowlist.add("http://localhost:5173");
  allowlist.add("http://localhost:3000");
  return {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowlist.has("*")) {
        callback(null, true);
        return;
      }
      if (
        allowlist.has(origin) ||
        origin.startsWith(`${portalOrigin}/`) ||
        origin.startsWith(`${portalSecondaryOrigin}/`)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS origin not allowed"));
    },
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Authorization",
      "Content-Type",
      "Idempotency-Key",
      "X-Request-Id",
    ],
    optionsSuccessStatus: 204,
  };
}

export function buildApp(): express.Express {
  const app = express();

  app.use(requestContext);
  app.use(requestLogger);
  app.use(express.json({ limit: getRequestBodyLimit() }));
  app.use(express.urlencoded({ extended: true }));
  const corsOptions = buildCorsOptions();
  app.use(cors(corsOptions));
  app.use((req, res, next) => {
    res.vary("Origin");
    next();
  });
  app.options("*", cors(corsOptions));
  app.use(securityHeaders);
  app.use(routeResolutionLogger);
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
  await checkDb();
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

  app.use(
    "/api",
    requireHttps,
    ensureIdempotencyKey,
    idempotencyMiddleware
  );

  const explicitMounts = [
    { path: "/auth", router: authRoutes },
    { path: "/lenders", router: lendersRoutes },
    { path: "/lender-products", router: lenderProductsRoutes },
    { path: "/applications", router: applicationsRoutes },
  ];
  const explicitPaths = new Set([
    "/_int",
    ...explicitMounts.map((entry) => entry.path),
  ]);
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
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (res.headersSent) {
        return;
      }
      const requestId = res.locals.requestId ?? "unknown";
      logError("request_failed", {
        requestId,
        method: _req.method,
        originalUrl: _req.originalUrl,
        statusCode: 500,
        errorName: err.name,
        errorMessage: err.message,
        ...(process.env.NODE_ENV === "production" ? {} : { stack: err.stack }),
      });
      res.status(500).json({
        code: "internal_error",
        message: "Unexpected error",
        requestId,
      });
    }
  );

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

const app = buildAppWithApiRoutes();

export default app;
