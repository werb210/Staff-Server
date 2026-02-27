import express from "express";
import { registerRoutes } from "./routes";
import { errorHandler } from "./middleware/errorHandler";

export function createApp(_options?: { test?: boolean }) {
  const app = express();
  app.use(express.json());
  registerRoutes(app);
  app.use((_req, res) => {
    res.status(404).json({ error: "Not Found" });
  });
  app.use(errorHandler);
  return app;
}

export function buildApp() {
  return createApp();
}

export function buildAppWithApiRoutes() {
  return createApp({ test: process.env.NODE_ENV === "test" });
}

export function registerApiRoutes(app: express.Express) {
  registerRoutes(app);
}

export function assertCorsConfig() {
  return;
}

export default createApp();
