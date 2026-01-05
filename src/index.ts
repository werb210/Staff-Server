import express, { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import authRoutes from "./routes/auth";
import applicationsRoutes from "./routes/applications";
import usersRoutes from "./routes/users";
import adminRoutes from "./routes/admin";
import staffRoutes from "./routes/staff";
import clientRoutes from "./routes/client";
import lenderRoutes from "./routes/lender";
import reportingRoutes from "./routes/reporting";
import internalRoutes from "./routes/internal";
import { requestId } from "./middleware/requestId";
import { requireRequestId } from "./middleware/requireRequestId";
import { errorHandler, notFoundHandler } from "./middleware/errors";

export type AppConfig = {
  port: number;
};

export const defaultConfig: AppConfig = {
  port: Number(process.env.PORT || 3000),
};

export function buildApp(config: AppConfig = defaultConfig): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(requestId);
  app.use(requireRequestId);

  app.get("/", (_req, res) => {
    res.status(200).json({ service: "boreal-staff-server" });
  });

  app.use("/api/_int", internalRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/applications", applicationsRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/client", clientRoutes);
  app.use("/api/lender", lenderRoutes);
  app.use("/api/reporting", reportingRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export async function initializeServer(
  config: AppConfig = defaultConfig
): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    buildApp(config);
    return;
  }

  const app = buildApp(config);

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(config.port, () => {
      resolve();
    });
    server.on("error", reject);
  });
}

if (require.main === module) {
  initializeServer();
}
