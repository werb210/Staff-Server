import express from "express";

import { requireAuth } from "./middleware/auth";
import authRoutes from "./routes/auth.routes";

export function createApp() {
  const app = express();

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use(express.json());

  app.use("/api/auth", authRoutes);

  app.use("/api/private", requireAuth, (_req, res) => {
    res.json({ ok: true });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: "INVALID_JSON" });
    }

    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "NOT_FOUND" });
  });

  return app;
}

export const buildAppWithApiRoutes = createApp;

export const app = createApp();

export default createApp;
