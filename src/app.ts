import express from "express";
import leadRoutes from "./modules/lead/lead.routes";
import lenderRoutes from "./modules/lender/lender.routes";
import healthRoutes from "./modules/health/health.routes";
import { requestContextMiddleware } from "./observability/requestContext";
import { errorHandler } from "./middleware/errorHandler";
import { securityHeaders } from "./middleware/security";
import { corsMiddleware } from "./middleware/cors";
import { httpMetricsMiddleware } from "./metrics/httpMetrics";

export function buildAppWithApiRoutes() {
  const app = express();
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(express.json({ limit: "1mb" }));
  app.use(requestContextMiddleware);
  app.use(httpMetricsMiddleware);
  app.use("/", healthRoutes);
  app.use("/api/leads", leadRoutes);
  app.use("/api/lenders", lenderRoutes);
  app.use(errorHandler);
  return app;
}
