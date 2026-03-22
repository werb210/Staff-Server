import { assertNoDuplicateRoutes } from "./_internal/routeConflicts";
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

  app.get("/_int/route-conflicts", (req, res) => {
    const { assertNoDuplicateRoutes } = require("./_internal/routeConflicts");
    try {
      assertNoDuplicateRoutes(app);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "conflicts detected" });
    }
  });

  // routes
  registerApiRouteMounts(app);
  assertNoDuplicateRoutes(app);

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
  assertNoDuplicateRoutes(app);
}

export function assertCorsConfig() {
  // no-op (prevents crashes from old imports)
}

export function buildAppWithApiRoutes() {
  return buildApp();
}
export const app = buildApp();

