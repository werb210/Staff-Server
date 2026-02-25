import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";

import { readyHandler } from "./routes/ready";
import { listRoutes, printRoutes } from "./debug/printRoutes";
import { requestContext } from "./middleware/requestContext";
import { correlationMiddleware } from "./middleware/correlationId";
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
import internalRoutes from "./routes/_int";
import { intHealthHandler } from "./routes/_int/health";
import { runtimeHandler } from "./routes/_int/runtime";
import { assertApiV1Frozen } from "./contracts/v1Freeze";
import { contractGuard } from "./middleware/contractGuard";
import requestLogMiddleware from "./middleware/logger";
import envCheck from "./middleware/envCheck";
import healthRoute from "./routes/health";
import contactRoute from "./routes/contact";
import applicationRoute from "./routes/application";
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
import productsRoutes from "./routes/products";
import liveChatRoutes from "./routes/liveChat";
import aiPlaceholderRoutes from "./routes/aiPlaceholder";
import aiRuleRoutes from "./modules/ai/rule.routes";
import aiConfidenceRoutes from "./modules/ai/confidence.routes";
import aiSessionRoutes from "./modules/ai/ai.routes";
import { logger as serverLogger } from "./server/utils/logger";
import twilioRoutes from "./routes/twilio";
import mayaInternalRoutes from "./routes/mayaInternal";
import mayaAnalyticsRoutes from "./routes/mayaAnalytics";
import adminUploadRoutes from "./routes/adminUploadRoutes";
import performanceRoutes from "./routes/performanceRoutes";
import enterpriseRoutes from "./routes/enterpriseRoutes";
import { requireAuth, requireAuthorization } from "./middleware/auth";
import { ROLES } from "./auth/roles";
import axios from "axios";
import { recordMetric } from "./core/metricsLogger";

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
  return {
    origin: [
      "https://staff.boreal.financial",
      "http://localhost:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  };
}

export function assertCorsConfig(): void {
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

const eventCache = new Map<string, number>();

function basicBotFilter(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const userAgent = req.headers["user-agent"] ?? "";
  if (userAgent.toLowerCase().includes("bot") || userAgent === "") {
    res.status(403).json({ error: "Bot traffic blocked" });
    return;
  }
  next();
}

function dedupeEvent(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const eventId =
    req.body && typeof req.body === "object" && "eventId" in req.body
      ? (req.body.eventId as string | undefined)
      : undefined;

  if (!eventId) {
    next();
    return;
  }

  const now = Date.now();
  const existing = eventCache.get(eventId);

  if (existing && now - existing < 60_000) {
    res.status(200).json({ status: "duplicate ignored" });
    return;
  }

  eventCache.set(eventId, now);
  next();
}

export function buildApp(): express.Express {
  const app = express();
  const corsOptions = buildCorsOptions();

  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  app.use(correlationMiddleware);
  app.use(requestLogMiddleware);
  app.use(requestContext);
  app.use(requestLogger);
  app.use(productionLogger);
  app.use(async (req, _res, next) => {
    await recordMetric("server_request", 1, { endpoint: req.path });
    next();
  });
  app.use((req, res, next) => {
    if (shouldBlockInternalOriginRequest(req.path, req.headers.origin)) {
      res.status(403).json({ ok: false, code: "forbidden" });
      return;
    }
    next();
  });
  app.use((req, res, next) => {
    res.vary("Origin");
    next();
  });
  app.use(securityHeaders);
  app.use((req, _res, next) => {
    if (req.headers["x-forwarded-for"]) {
      // eslint-disable-next-line no-console
      console.log("Incoming IP:", req.headers["x-forwarded-for"]);
    }
    next();
  });
  app.use("/api/", apiLimiter);
  app.use(routeResolutionLogger);
  app.use(requestTimeout);

  if (process.env.NODE_ENV !== "production") {
    app.use("/api/_int", internalRoutes);
    app.get("/_int/health", intHealthHandler);
    app.get("/_int/runtime", runtimeHandler);
  }

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  app.get("/api/ready", readyHandler);
  if (process.env.NODE_ENV !== "production") {
    app.get("/api/_int/production-readiness", (_req, res) => {
      res.json({ success: true, data: { status: "ready" } });
    });
  }
  app.get("/health", async (_req, res) => {
    let mayaStatus = "unconfigured";

    if (process.env.MAYA_INTERNAL_URL) {
      try {
        const mayaHealth = await axios.get(`${process.env.MAYA_INTERNAL_URL}/health`);
        mayaStatus = mayaHealth.data?.status ?? "unknown";
      } catch (_error) {
        mayaStatus = "unreachable";
      }
    }

    res.json({ status: "ok", uptime: process.uptime(), maya: mayaStatus });
  });
  app.get("/build-info", (_req, res) => {
    res.json({
      node: process.version,
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
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

  const requireAdmin = [
    requireAuth,
    requireAuthorization({ roles: [ROLES.ADMIN] }),
  ] as const;

  app.use("/api/admin", ...requireAdmin, adminUploadRoutes);
  app.use("/api", ...requireAdmin, performanceRoutes);
  app.use("/api", ...requireAdmin, enterpriseRoutes);

  app.use("/api/twilio", twilioRoutes);
  app.use(envCheck);
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
  app.use("/api/application", externalEndpointLimiter, applicationRoute);
  app.use("/api/credit", externalEndpointLimiter, creditRoutes);
  app.use("/api/support/issues", externalEndpointLimiter, issueFoundationRoutes);
  app.use("/api/report", issueRoutes);
  app.use("/api/report-issue", publicLimiter, issueRoutes);
  app.use("/api/chat", externalEndpointLimiter, chatRoutes);
  app.use("/api", externalEndpointLimiter, aiV2Routes);
  app.use("/api", externalEndpointLimiter, chatApiRoutes);
  app.use("/api/support", strictLimiter, supportRoutes);
  app.use("/api/public", externalEndpointLimiter, publicRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/readiness", readinessRoutes);
  app.use("/api/continuation", externalEndpointLimiter, continuationRoutes);
  app.use("/api/products", externalEndpointLimiter, productsRoutes);
  app.use("/api", externalEndpointLimiter, liveChatRoutes);
  app.use("/api", externalEndpointLimiter, aiPlaceholderRoutes);
  app.use("/api/scoring", readinessRoutes);
  app.use("/api/product-comparison", productComparisonRoutes);
  app.use("/api/comparison", productComparisonRoutes);
  app.use("/api/lead", strictLimiter, leadRoute);
  app.use("/api/leads", externalEndpointLimiter, crmLeadRoutes);
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
  app.use("/api/maya", mayaInternalRoutes);
  app.use("/api", mayaAnalyticsRoutes);

  app.use("/api/tracking", basicBotFilter);
  app.use("/api/drafts", basicBotFilter);

  app.post("/api/tracking", dedupeEvent, async (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.post("/api/drafts/save", async (req, res) => {
    const draft = req.body;

    if (!draft || typeof draft !== "object" || !("resumeToken" in draft) || !draft.resumeToken) {
      res.status(400).json({ error: "Missing resume token" });
      return;
    }

    if (JSON.stringify(draft).length > 500_000) {
      res.status(400).json({ error: "Draft too large" });
      return;
    }

    res.json({ status: "saved" });
  });


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
