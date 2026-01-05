import express, { Express } from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";

import { initializeAppInsights } from "./observability/appInsights";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import {
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

const PORT = Number(process.env.PORT) || 8080;

/**
 * BUILD APP (used by tests)
 * NO side effects
 */
export function buildApp(): Express {
  const app = express();

  app.get("/", (_req, res) => res.status(200).send("OK"));
  app.get("/health", (_req, res) => res.status(200).send("OK"));

  app.use(cors({ origin: getCorsAllowlistConfig() }));
  app.use(express.json({ limit: getRequestBodyLimit() }));
  app.use(helmet());

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
  app.use("/api/internal", internalRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * PRODUCTION SERVER START
 * NEVER runs in tests
 */
export function initializeServer(): void {
  if (process.env.NODE_ENV === "test") return;

  initializeAppInsights();

  const app = buildApp();
  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`server_listening:${PORT}`);
  });
}

/**
 * ENTRYPOINT
 */
if (require.main === module) {
  initializeServer();
}
