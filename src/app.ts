import express from "express";
import { registerApiRoutes } from "./routes";

export function buildApp() {
  const app = express();

  app.use(express.json());

  return app;
}

export function buildAppWithApiRoutes() {
  const app = buildApp();
  registerApiRoutes(app);
  return app;
}

export { registerApiRoutes };
