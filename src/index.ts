import express, { Express } from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";

import { initializeAppInsights } from "./observability/appInsights";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import { getCorsAllowlistConfig, getRequestBodyLimit } from "./config";

import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import staffRoutes from "./routes/staff";
import adminRoutes from "./routes/admin";
import applicationsRoutes from "./routes/applications";
import lenderRoutes from "./routes/lender";
import clientRoutes from "./routes/client";
import reportingRoutes from "./routes/reporting";
import reportsRoutes from "./routes/reports";
import internalRoutes from "./routes/internal";

const PORT = Number(process.env.PORT) || 8080;

/**
 * buildApp()
 * - PURE
 * - NO side effects
 * - SAFE for CI imports
 */
export function buildApp(): Express {
  const app = express();

  // MUST be first – used by Azure + smoke tests
  app.get("/api/_int/health", (_req, res) =>
    res.status(200).json({ ok: true })
  );

  app.get("/", (_req, res) => res.status(200).send("OK"));

  app.use(cors({ origin: getCorsAllowlistConfig() }));
  app.use(helmet());
  app.use(express.json({ limit: getRequestBodyLimit() }));

  app.use(requestId);
  app.use(requestLogger);

  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/applications", applicationsRoutes);
  app.use("/api/lender", lenderRoutes);
  app.use("/api/client", clientRoutes);
  app.use("/api/reporting", reportingRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/_int", internalRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * initializeServer()
 * - ONLY place that binds PORT
 * - ONLY place AppInsights runs
 */
export async function initializeServer(): Promise<void> {
  initializeAppInsights();

  const app = buildApp();
  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.info(`server_listening`, { port: PORT });
  });
}

// REQUIRED for Azure App Service
if (require.main === module) {
  initializeServer().catch((err) => {
    console.error("server_boot_failed", err);
    process.exit(1);
  });
}
