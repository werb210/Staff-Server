import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { readyHandler } from "./routes/ready";
import { listRoutes, printRoutes } from "./debug/printRoutes";
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
import { checkDb, db } from "./db";
import {
  productionLogger,
  requireHttps,
  securityHeaders,
} from "./middleware/security";
import { apiLimiter, publicLimiter, strictLimiter } from "./middleware/rateLimit";
import { idempotencyMiddleware } from "./middleware/idempotency";
import { ensureIdempotencyKey } from "./middleware/idempotencyKey";
import { notFoundHandler } from "./middleware/errors";
import { logError } from "./observability/logger";
import { getRequestContext } from "./observability/requestContext";
import authRoutes from "./routes/auth";
import lendersRoutes from "./routes/lenders";
import lenderProductsRoutes from "./routes/lenderProducts";
import applicationsRoutes from "./routes/applications";
import aiRoutes from "./routes/ai";
import creditRoutes from "./routes/credit";
import issueFoundationRoutes from "./routes/issues";
import aiV2Routes from "./routes/ai.v2";
import chatApiRoutes from "./modules/ai/chat.routes";
import capitalRoutes from "./modules/ai/capital.routes";
import internalRoutes from "./routes/_int";
import { intHealthHandler } from "./routes/_int/health";
import { runtimeHandler } from "./routes/_int/runtime";
import { assertApiV1Frozen } from "./contracts/v1Freeze";
import { contractGuard } from "./middleware/contractGuard";
import requestLogMiddleware from "./middleware/logger";
import envCheck from "./middleware/envCheck";
import healthRoute from "./routes/health";
import contactRoute from "./routes/contact";
import leadRoute from "./routes/lead";
import crmRoutes from "./routes/crm";
import issueRoutes from "./routes/issueReport";
import chatRoutes from "./routes/chat";
import supportRoutes from "./routes/support";
import publicRoutes from "./routes/public";
import analyticsRoutes from "./routes/analytics";
import readinessRoutes from "./routes/readiness";
import productComparisonRoutes from "./routes/productComparison";
import crmLeadRoutes from "./routes/leads";
import aiCoreRoutes from "./routes/aiCore";
import preApplicationRoutes from "./routes/preApplication";
import applicationContinuationRoutes from "./modules/continuation/continuation.routes";
import creditReadinessRoutes from "./routes/creditReadiness";
import clientContinuationRoutes from "./routes/clientContinuation";
import continuationRoutes from "./routes/continuation";
import liveChatRoutes from "./routes/liveChat";
import aiPlaceholderRoutes from "./routes/aiPlaceholder";
import aiRuleRoutes from "./modules/ai/rule.routes";
import aiConfidenceRoutes from "./modules/ai/confidence.routes";
import aiSessionRoutes from "./modules/ai/ai.routes";
import { logger as serverLogger } from "./server/utils/logger";

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

function getRequiredCorsOrigins(): string[] {
  return [
    process.env.CLIENT_URL,
    process.env.PORTAL_URL,
    process.env.WEBSITE_URL,
  ]
    .map((origin) => (typeof origin === "string" ? origin.trim() : ""))
    .filter((origin) => origin.length > 0);
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
  const allowlist = new Set(getRequiredCorsOrigins());
  return {
    origin: [...allowlist],
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
  const requiredOrigins = {
    CLIENT_URL: process.env.CLIENT_URL,
    PORTAL_URL: process.env.PORTAL_URL,
    WEBSITE_URL: process.env.WEBSITE_URL,
  };
  const missingOrigins = Object.entries(requiredOrigins)
    .filter(([, value]) => typeof value !== "string" || value.trim().length === 0)
    .map(([key]) => key);
  if (missingOrigins.length > 0) {
    serverLogger.warn("cors_origin_env_missing", { missingOrigins });
  }

  const allowlist = getRequiredCorsOrigins();
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

  if (allowlist.length === 0) {
    throw new Error("At least one of WEBSITE_URL, PORTAL_URL, or CLIENT_URL must be configured for CORS.");
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

  app.use(requestLogMiddleware);
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
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  const corsOptions = buildCorsOptions();
  app.use(cors(corsOptions));
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  app.use((req, res, next) => {
    res.vary("Origin");
    next();
  });
  app.options("*", cors(corsOptions));
  app.use(securityHeaders);
  app.use("/api/", apiLimiter);
  app.use(routeResolutionLogger);
  app.use(requestTimeout);

  if (process.env.NODE_ENV !== "production") {
    app.use("/api/_int", internalRoutes);
    app.get("/_int/health", intHealthHandler);
    app.get("/_int/runtime", runtimeHandler);
  }

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        status: "ok",
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
      },
    });
  });
  app.get("/api/ready", readyHandler);
  if (process.env.NODE_ENV !== "production") {
    app.get("/api/_int/production-readiness", (_req, res) => {
      res.json({ success: true, data: { status: "ready" } });
    });
  }
  app.get("/health", async (_req, res) => {
    try {
      await db.query("SELECT 1");
      res.json({ status: "ok" });
    } catch (_err) {
      res.status(500).json({ status: "db_error" });
    }
  });
  app.use("/health/details", healthRoute);
  app.get("/ready", readyHandler);
  if (process.env.NODE_ENV !== "production") {
    app.get("/__boot", (_req, res) => {
      res.status(200).json({
        success: true,
        data: {
          pid: process.pid,
          port: app.get("port") ?? null,
        },
      });
    });
  }

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
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/api", limiter);
  const externalEndpointLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ success: false, error: "Too many requests" });
    },
    skip: () => process.env.NODE_ENV === "test",
  });

  app.use("/api/contact", externalEndpointLimiter, contactRoute);
  app.use("/api/credit", externalEndpointLimiter, creditRoutes);
  app.use("/api/support/issues", externalEndpointLimiter, issueFoundationRoutes);
  app.use("/api/report", issueRoutes);
  app.use("/api/report-issue", publicLimiter, issueRoutes);
  app.use("/api/chat", externalEndpointLimiter, chatRoutes);
  app.use("/api", externalEndpointLimiter, aiV2Routes);
  app.use("/api", externalEndpointLimiter, chatApiRoutes);
  app.use("/api", externalEndpointLimiter, capitalRoutes);
  app.use("/api/support", strictLimiter, supportRoutes);
  app.use("/api/public", externalEndpointLimiter, publicRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/readiness", readinessRoutes);
  app.use("/api/continuation", externalEndpointLimiter, continuationRoutes);
  app.use("/api", externalEndpointLimiter, liveChatRoutes);
  app.use("/api", externalEndpointLimiter, aiPlaceholderRoutes);
  app.use("/api/scoring", readinessRoutes);
  app.use("/api/product-comparison", productComparisonRoutes);
  app.use("/api/comparison", productComparisonRoutes);
  app.use("/api/lead", strictLimiter, leadRoute);
  app.use("/api/crm/leads", externalEndpointLimiter, crmLeadRoutes);
  app.use("/api/preapp", externalEndpointLimiter, preApplicationRoutes);
  app.use("/api/credit-readiness", externalEndpointLimiter, creditReadinessRoutes);
  app.use("/api/client/continuation", externalEndpointLimiter, clientContinuationRoutes);
  app.use("/api/application/continuation", applicationContinuationRoutes);
  app.use("/api", externalEndpointLimiter, aiCoreRoutes);
  app.use("/api", externalEndpointLimiter, aiRuleRoutes);
  app.use("/api", externalEndpointLimiter, aiConfidenceRoutes);
  app.use("/api/ai", externalEndpointLimiter, aiSessionRoutes);
  app.use("/api/crm", crmRoutes);
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
    if (entry.path === "/auth") {
      app.use(`/api${entry.path}`, externalEndpointLimiter, entry.router);
      return;
    }
    if (entry.path === "/ai") {
      // Keep AI widget endpoints public for website/client integrations.
      app.use(`/api${entry.path}`, externalEndpointLimiter, entry.router);
      return;
    }
    app.use(`/api${entry.path}`, entry.router);
  });
  API_ROUTE_MOUNTS.filter((entry) => !explicitPaths.has(entry.path)).forEach(
    (entry) => {
      app.use(`/api${entry.path}`, entry.router);
    }
  );

  app.use("/api", notFoundHandler);
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
      const shouldLogStack = process.env.NODE_ENV === "development" || Boolean(requestContext?.sqlTraceEnabled);
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
        success: false,
        error: "Internal Server Error",
      });
    }
  );

  const mountedRoutes = listRoutes(app);
  printRoutes(app);
  if (process.env.PRINT_ROUTES === "true") {
    serverLogger.info("mounted_routes", {
      routes: mountedRoutes.map((route) => `${route.method} ${route.path}`),
    });
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
