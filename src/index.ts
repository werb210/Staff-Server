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

type AppConfig = {
  serviceName: string;
  enableRequestLogging: boolean;
  port: number;
};

const defaultConfig: AppConfig = {
  serviceName: "boreal-staff-server",
  enableRequestLogging: process.env.NODE_ENV !== "test",
  port: Number.isFinite(Number(process.env.PORT))
    ? Number(process.env.PORT)
    : 3000,
};

export function buildApp(config: AppConfig = defaultConfig): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(requestId);

  if (config.enableRequestLogging) {
    app.use(requestLogger);
  }

  app.get("/", (_req, res) => {
    res.status(200).json({ service: config.serviceName });
  });

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
  const app = buildApp(defaultConfig);

  const server = app.listen(defaultConfig.port, () => {
    console.log(`Staff Server listening on port ${defaultConfig.port}`);
  });
  if (process.env.NODE_ENV === "test") {
    server.unref();
  }
}

if (require.main === module) {
  void initializeServer();
}
