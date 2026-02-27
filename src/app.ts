import express, { Express } from "express";
import { registerApiRoutes as registerRoutes } from "./routes";

export function buildApp(): Express {
  const app = express();

  app.use(express.json());

  return app;
}

/**
 * Required for test contract compatibility.
 * DO NOT REMOVE.
 * Many tests call:
 *   const app = buildApp();
 *   registerApiRoutes(app);
 */
export function registerApiRoutes(app: Express): void {
  registerRoutes(app);
}

export function buildAppWithApiRoutes(): Express {
  const app = buildApp();
  registerApiRoutes(app);
  return app;
}
