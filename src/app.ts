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
import { globalErrorHandler } from "./middleware/globalErrorHandler";

/* ------------------------ ROUTE ASSERTION ------------------------ */

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

/* ------------------------ APP BUILD ------------------------ */

export function buildApp(): express.Express {
  const app = express();

  app.use(requestLogMiddleware);
  app.use(requestContext);
  app.use(requestLogger);
  app.use(productionLogger);

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  app.use(securityHeaders);
  app.use("/api/", apiLimiter);
  app.use(routeResolutionLogger);
  app.use(requestTimeout);

  return app;
}

/* ------------------------ INIT ------------------------ */

export async function initializeServer(): Promise<void> {
  markNotReady("initializing");
  await checkDb();
  markReady();
}

/* ------------------------ REGISTER ROUTES ------------------------ */

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

  /* ROUTES */
  app.use("/api/auth", authRoutes);
  app.use("/api/lenders", lendersRoutes);
  app.use("/api/lender-products", lenderProductsRoutes);
  app.use("/api/applications", applicationsRoutes);
  app.use("/api/ai", aiRoutes);

  /* NOT FOUND */
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

/* ------------------------ BOOTSTRAP ------------------------ */

export function buildAppWithApiRoutes(): express.Express {
  const app = buildApp();
  registerApiRoutes(app);
  return app;
}

const app = buildAppWithApiRoutes();

export default app;
