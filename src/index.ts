// FILE: src/index.ts
const { initializeAppInsights } = require("./observability/appInsights");

initializeAppInsights();

import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
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
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import {
  assertEnv,
  getCorsAllowlistConfig,
  getRequestBodyLimit,
  isProductionEnvironment,
  isTestEnvironment,
  shouldRunMigrations,
} from "./config";
import { globalRateLimit } from "./middleware/rateLimit";
import { enforceSecureCookies, requireHttps } from "./middleware/security";
import { logInfo } from "./observability/logger";
import { checkDb, logBackupStatus } from "./db";
import { runMigrations } from "./migrations";

type AppConfig = {
  serviceName: string;
  enableRequestLogging: boolean;
  port: number;
};

const defaultConfig: AppConfig = {
  serviceName: "boreal-staff-server",
  enableRequestLogging: !isTestEnvironment(),
  port: Number.isFinite(Number(process.env.PORT)) ? Number(process.env.PORT) : 8080,
};

export function buildApp(config: AppConfig = defaultConfig): Express {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.get("/api/_int/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get("/", (_req, res) => {
    res.status(200).send("OK");
  });

  app.get(/^\/robots.*\.txt$/, (_req, res) => {
    res.status(200).send("OK");
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
        },
      },
    })
  );

  const corsAllowlist = getCorsAllowlistConfig();
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (corsAllowlist.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("cors_not_allowed"));
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: getRequestBodyLimit() }));
  app.use(express.urlencoded({ extended: true, limit: getRequestBodyLimit() }));
  app.use(requestId);

  if (config.enableRequestLogging) {
    app.use(requestLogger);
  }

  app.use(enforceSecureCookies);
  app.use(requireHttps);

  if (isProductionEnvironment()) {
    app.use(globalRateLimit());
  }

  app.use("/api/_int", internalRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/applications", applicationsRoutes);
  app.use("/api/lender", lenderRoutes);
  app.use("/api/client", clientRoutes);
  app.use("/api/reporting", reportingRoutes);
  app.use("/api/reports", reportsRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export async function initializeServer(): Promise<void> {
  assertEnv();

  await checkDb();

  if (!isTestEnvironment()) {
    await logBackupStatus();
  }

  if (isProductionEnvironment() && shouldRunMigrations()) {
    await runMigrations();
  }

  const app = buildApp(defaultConfig);

  const server = app.listen(defaultConfig.port, () => {
    logInfo("server_listening", { port: defaultConfig.port });
  });

  if (isTestEnvironment()) {
    server.unref();
  }
}

if (require.main === module) {
  void initializeServer();
}
