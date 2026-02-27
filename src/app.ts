import express, { Express } from "express";
import { registerApiRoutes } from "./routes";

export function buildApp(): Express {
  const app = express();

  app.use(express.json());

  return app;
}

export function buildAppWithApiRoutes(): Express {
  const app = buildApp();
  registerApiRoutes(app);
  return app;
}
