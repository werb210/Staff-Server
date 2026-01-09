import cors from "cors";
import express, { Request, Response } from "express";

import apiRouter from "./api";
import { printRoutes } from "./debug/printRoutes";
import { runMigrations } from "./migrations";

export function buildApp(): express.Express {
  const app = express();

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

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get("/", (_req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  app.use("/api", apiRouter);

  printRoutes(app);

  return app;
}

export async function initializeServer(): Promise<void> {
  await runMigrations();
}
