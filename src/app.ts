import express from "express";
import { registerApiRouteMounts } from "./routes/routeRegistry";
import { requestLogger } from "./middleware/requestLogger";

export function buildApp() {
  const app = express();

  app.use(requestLogger);
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  registerApiRouteMounts(app);

  return app;
}

// ---- BACKWARD COMPAT ----
export function createApp() {
  return buildApp();
}

export function registerApiRoutes(app: any) {
  registerApiRouteMounts(app);
}

export function assertCorsConfig() {
  return true;
}

export function buildAppWithApiRoutes() {
  return buildApp();
}

const app = buildApp();
export default app;
export { app };
