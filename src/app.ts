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
import {
  apiLimiter,
  productionLogger,
  requireHttps,
  securityHeaders,
} from "./middleware/security";
import { idempotencyMiddleware } from "./middleware/idempotency";
import { ensureIdempotencyKey } from "./middleware/idempotencyKey";
import { notFoundHandler } from "./middleware/errors";
import { errorHandler } from "./middleware/errorHandler";
import { logError } from "./observability/logger";
import { getRequestContext } from "./observability/requestContext";
import authRoutes from "./routes/auth";
import lendersRoutes from "./routes/lenders";
import lenderProductsRoutes from "./routes/lenderProducts";
import applicationsRoutes from "./routes/applications";
import aiRoutes from "./routes/ai";
import internalRoutes from "./routes/_int";
import { intHealthHandler } from "./routes/_int/health";
import { runtimeHandler } from "./routes/_int/runtime";
import { assertApiV1Frozen } from "./contracts/v1Freeze";
import { contractGuard } from "./middleware/contractGuard";
import logger from "./middleware/logger";
import envCheck from "./middleware/envCheck";
import healthRoute from "./routes/health";
import contactRoute from "./routes/contact";
import leadRoute from "./routes/lead";
import issueRoutes from "./routes/issueReport";
import chatRoutes from "./routes/chatEscalation";

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

const PORTAL_ORIGINS = [
  "https://staff.boreal.financial",
  "https://portal.staff.boreal.financial",
];

function getCorsAllowlist(): Set<string> {
  const allowlist = new Set(getCorsAllowlistConfig());
  PORTAL_ORIGINS.forEach((origin) => allowlist.add(origin));
  allowlist.add("http://localhost:5173");
  allowlist.add("http://localhost:3000");
  return allowlist;
}

export function shouldBlockInternalOriginRequest(
  path: string,
  origin?: string
): boolean {
  return (
    Boolean(origin) &&
    (path.startsWith("/api/_int") || path.startsWith("/api/internal"))
  );
}

function buildCorsOptions(): cors.CorsOptions {
  const allowlist = getCorsAllowlist();
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
      if (allowlist.has(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
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

export function assertCorsConfig(): void {
  const allowlist = getCorsAllowlist();
  const missingOrigins = PORTAL_ORIGINS.filter((origin) => !allowlist.has(origin));
  const corsOptions = buildCorsOptions();
  const allowedHeaders = Array.isArray(corsOptions.allowedHeaders)
    ? corsOptions.allowedHeaders
    : typeof corsOptions.allowedHeaders === "string"
      ? corsOptions.allowedHeaders.split(",").map((header) => header.trim())
      : [];
  const hasAuthorization = allowedHeaders.some(
    (header) => header.toLowerCase() === "authorization"
  );
  const shouldBlock = shouldBlockInternalOriginRequest(
    "/api/_int/routes",
    "https://staff.boreal.financial"
  );
  const shouldAllowServer =
    !shouldBlockInternalOriginRequest("/api/_int/routes", undefined);

  if (missingOrigins.length > 0) {
    throw new Error(`Missing CORS allowlist origins: ${missingOrigins.join(", ")}`);
  }
  if (corsOptions.credentials !== true) {
    throw new Error("CORS credentials must be enabled.");
  }
  if (!hasAuthorization) {
    throw new Error("CORS Authorization header must be allowed.");
  }
  if (!shouldBlock || !shouldAllowServer) {
    throw new Error("Internal browser route guard misconfigured.");
  }
}

export function buildApp(): express.Express {
  const app = express();

  app.use(logger);
  app.use(requestContext);
  app.use(requestLogger);
  app.use(productionLogger);
  app.use((req, res, next) => {
    if (shouldBlockInternalOriginRequest(req.path, req.headers.origin)) {
      res.status(403).json({ ok: false, code: "forbidden" });
      return;
    }
    next();
  });
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
  app.use(apiLimiter);
  app.use(routeResolutionLogger);
  app.use(requestTimeout);

  app.use("/api/_int", internalRoutes);
  app.get("/_int/health", intHealthHandler);
  app.get("/_int/runtime", runtimeHandler);

  app.get("/api/health", healthHandler);
  app.get("/api/ready", readyHandler);
  app.get("/health", healthHandler);
  app.use("/health/details", healthRoute);
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
  assertApiV1Frozen();
  app.use(envCheck);
  app.use("/api/contact", contactRoute);
  app.use("/api/report", issueRoutes);
  app.use("/api/chat/escalate", chatRoutes);
  app.use("/api/lead", leadRoute);
  app.use("/api/healthz", healthRoute);

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

  app.use("/api/client", contractGuard);
  app.use("/api/portal", contractGuard);

  const explicitMounts = [
    { path: "/auth", router: authRoutes },
    { path: "/lenders", router: lendersRoutes },
    { path: "/lender-products", router: lenderProductsRoutes },
    { path: "/applications", router: applicationsRoutes },
    { path: "/ai", router: aiRoutes },
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
      const requestContext = getRequestContext();
      const shouldLogStack = requestContext?.sqlTraceEnabled ?? false;
      logError("request_failed", {
        requestId,
        method: _req.method,
        originalUrl: _req.originalUrl,
        statusCode: 500,
        errorName: err.name,
        errorMessage: err.message,
        ...(shouldLogStack ? { stack: err.stack } : {}),
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
