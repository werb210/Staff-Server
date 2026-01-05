import cors from "cors";
import express, { Express } from "express";
import helmet from "helmet";
import http from "http";
import { getCorsAllowlistConfig, getRequestBodyLimit } from "./config";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { initializeAppInsights } from "./observability/appInsights";
import { logInfo } from "./observability/logger";
import adminRoutes from "./routes/admin";
import applicationsRoutes from "./routes/applications";
import authRoutes from "./routes/auth";
import clientRoutes from "./routes/client";
import internalRoutes from "./routes/internal";
import lenderRoutes from "./routes/lender";
import reportingRoutes from "./routes/reporting";
import reportsRoutes from "./routes/reports";
import staffRoutes from "./routes/staff";
import usersRoutes from "./routes/users";

const PORT = Number(process.env.PORT) || 8080;

function buildApp(): Express {
  const app = express();

  app.get("/", (_req, res) => res.status(200).send("OK"));
  app.get("/health", (_req, res) => res.status(200).send("OK"));

  app.use(helmet());
  app.use(cors({ origin: getCorsAllowlistConfig() }));
  app.use(requestId);
  app.use(requestLogger);
  app.use(express.json({ limit: getRequestBodyLimit() }));

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

async function initializeServer(): Promise<void> {
  initializeAppInsights();

  const app = buildApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "0.0.0.0", () => {
      logInfo("server_listening", { port: PORT });
      resolve();
    });
  });
}

if (require.main === module) {
  void (async () => {
    await initializeServer();
  })();
}

export { buildApp, initializeServer };
