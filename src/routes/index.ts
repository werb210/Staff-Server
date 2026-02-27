import type { Express } from "express";
import { Router } from "express";
import readyRouter from "./ready";
import healthRouter from "./health";
import { registerApiRouteMounts } from "./routeRegistry";

export function registerRoutes(app: Express) {
  const apiRouter = Router();
  registerApiRouteMounts(apiRouter);
  apiRouter.use("/health", healthRouter);
  app.use("/api", apiRouter);
  app.use(readyRouter);
}
