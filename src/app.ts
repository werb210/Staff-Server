import express from "express";
import { registerRoutes } from "./routes";

export function buildApp() {
  const app = express();
  app.use(express.json());
  registerRoutes(app);
  return app;
}

export function buildAppWithApiRoutes() {
  return buildApp();
}

export function registerApiRoutes(app: express.Express) {
  registerRoutes(app);
}

export function assertCorsConfig() {
  return;
}

export default buildApp();
