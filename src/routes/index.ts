import { Express } from "express";
import authRouter from "./auth";
import clientRouter from "./client";
import portalRouter from "./portal";
import lendersRouter from "./lenders";
import healthRouter from "./health";

export function registerRoutes(app: Express) {
  app.use("/api/auth", authRouter);
  app.use("/api/client", clientRouter);
  app.use("/api/portal", portalRouter);
  app.use("/api/lenders", lendersRouter);
  app.use("/api/health", healthRouter);
}
