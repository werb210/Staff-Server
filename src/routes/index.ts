import type { Express } from "express";
import { Router } from "express";
import readyRouter, { readyHandler } from "./ready";
import healthRouter from "./health";
import { registerApiRouteMounts } from "./routeRegistry";

export function registerRoutes(app: Express) {
  app.use("/api/_int", (req, res, next) => {
    const origin = req.headers.origin;

    if (origin && origin.includes("http")) {
      return res.status(403).json({
        error: "forbidden",
      });
    }

    next();
  });

  const apiRouter = Router();
  registerApiRouteMounts(apiRouter);
  apiRouter.use("/health", healthRouter);
  apiRouter.get("/ready", readyHandler);

  app.use("/api", apiRouter);
  app.use("/health", healthRouter);
  app.use(readyRouter);
}


export function registerApiRoutes(app: Express) {
  registerRoutes(app);
}
