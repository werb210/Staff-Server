import cors from "cors";
import express from "express";

import apiRouter from "./api";
import { printRoutes } from "./debug/printRoutes";
import { runMigrations } from "./migrations";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";

export function buildApp(): express.Express {
  const app = express();

  app.use((req, _res, next) => {
    console.log("[REQ]", req.method, req.originalUrl);
    next();
  });

  app.use(requestId);
  app.use(requestLogger);

  app.use(
    cors({
      origin: true,
      credentials: false,
      allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
      exposedHeaders: ["x-request-id"],
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", apiRouter);

  printRoutes(app);

  return app;
}

export async function initializeServer(): Promise<void> {
  await runMigrations();
}
