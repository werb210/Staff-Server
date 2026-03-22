import express from "express";
import { registerApiRouteMounts } from "./routes/routeRegistry";

// -------------------------
// CORE APP BUILDER
// -------------------------
export function buildApp() {
  const app = express();

  app.use(express.json());

  // health
  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  // routes
  registerApiRouteMounts(app);

  return app;
}

// -------------------------
// BACKWARD COMPAT EXPORTS
// -------------------------

export function createApp() {
  return buildApp();
}

export function registerApiRoutes(app: any) {
  registerApiRouteMounts(app);
}

export function assertCorsConfig() {
  // no-op (prevents crashes from old imports)
}

export function buildAppWithApiRoutes() {
  return buildApp();
}
export const app = buildApp();

