import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

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
import { PORTAL_ROUTE_REQUIREMENTS } from "./routes/routeRegistry";
import { checkDb } from "./db";
import {
  productionLogger,
  requireHttps,
  securityHeaders,
} from "./middleware/security";
import { notFoundHandler } from "./middleware/errors";
import authRoutes from "./routes/auth";
import lendersRoutes from "./routes/lenders";
import lenderProductsRoutes from "./routes/lenderProducts";
import applicationsRoutes from "./routes/applications";
import aiRoutes from "./routes/ai";
import { assertApiV1Frozen } from "./contracts/v1Freeze";
import requestLogMiddleware from "./middleware/logger";
import envCheck from "./middleware/envCheck";
import { logger as serverLogger } from "./server/utils/logger";
import { globalErrorHandler } from "./middleware/globalErrorHandler";

/* ---------------- CORS ---------------- */

function getRequiredCorsOrigins(): string[] {
  return [
    process.env.CLIENT_URL,
    process.env.PORTAL_URL,
    process.env.WEBSITE_URL,
  ]
    .map((o) => (typeof o === "string" ? o.trim() : ""))
    .filter((o) => o.length > 0);
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
  const allowlist = getRequiredCorsOrigins();
  if (allowlist.length === 0) {
    throw new Error(
      "At least one of WEBSITE_URL, PORTAL_URL, or CLIENT_URL must be configured for CORS."
    );
  }
}

/* ---------------- ROUTE ASSERTION ---------------- */

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

/* ---------------- BUILD APP ---------------- */

export function buildApp(): express.Express {
  const app = express();

  app.use(requestLogMiddleware);
  app.use(requestContext);
  app.use(requestLogger);
  app.use(productionLogger);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  const corsOptions = buildCorsOptions();
  app.use(cors(corsOptions));
  app.options("*", cors(corsOptions));

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  app.use(securityHeaders);
  app.use(routeResolutionLogger);
  app.use(requestTimeout);

  return app;
}

/* ---------------- INIT ---------------- */

export async function initializeServer(): Promise<void> {
  markNotReady("initializing");
  await checkDb();
  markReady();
}

/* ---------------- REGISTER ROUTES ---------------- */

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

  app.use("/api/auth", authRoutes);
  app.use("/api/lenders", lendersRoutes);
  app.use("/api/lender-products", lenderProductsRoutes);
  app.use("/api/applications", applicationsRoutes);
  app.use("/api/ai", aiRoutes);

  app.use("/api", notFoundHandler);

  /* GLOBAL ERROR HANDLER — MUST BE LAST */
  app.use(globalErrorHandler);

  const mountedRoutes = listRoutes(app);
  printRoutes(app);

  if (process.env.PRINT_ROUTES === "true") {
    serverLogger.info("mounted_routes", {
      routes: mountedRoutes.map((route) => `${route.method} ${route.path}`),
    });
  }

  assertRoutesMounted(app);
}

/* ---------------- BOOTSTRAP ---------------- */

export function buildAppWithApiRoutes(): express.Express {
  const app = buildApp();
  registerApiRoutes(app);
  return app;
}

const app = buildAppWithApiRoutes();

export default app;
