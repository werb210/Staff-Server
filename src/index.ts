import express, { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import { initializeAppInsights } from "./observability/appInsights";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import {
  assertEnv,
  getCorsAllowlistConfig,
  getRequestBodyLimit,
} from "./config";
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
import { logInfo } from "./observability/logger";
import http from "http";

/**
 * Build express app — REQUIRED BY TESTS
 */
export function buildApp(): Express {
  const app = express();

  // PUBLIC ROOT — MUST BE FIRST
  app.get("/", (_req, res) => res.status(200).send("OK"));

  // PUBLIC HEALTH
  app.get("/api/_int/health", (_req, res) => res.status(200).json({ ok: true }));

  // GLOBAL MIDDLEWARE
  app.use(requestId);
  app.use(requestLogger);
  app.use(helmet());
  app.use(cors({ origin: getCorsAllowlistConfig() }));
  app.use(express.json({ limit: getRequestBodyLimit() }));

  // ROUTES
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

  // ERRORS LAST
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Initialize server — REQUIRED BY TESTS
 */
export async function initializeServer(): Promise<void> {
  initializeAppInsights();
  assertEnv();

  const app = buildApp();
  const port = Number(process.env.PORT) || 8080;

  const server = http.createServer(app);
  if (process.env.NODE_ENV !== "test") {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "0.0.0.0", () => {
        logInfo("server_listening", { port });
        resolve();
      });
    });
  }
}

/**
 * PROD ENTRYPOINT ONLY
 */
if (require.main === module) {
  initializeServer();
}
