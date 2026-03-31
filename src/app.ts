import cors from "cors";
import express from "express";

import { requireAuth } from "./middleware/auth";
import { requestId } from "./middleware/requestId";
import authRoutes from "./routes/auth.routes";
import privateRoutes from "./routes/private.routes";
import publicRoutes from "./routes/public";

function requireEnv(name: string, fallback?: string) {
  const v = process.env[name] || fallback;
  if (!v) {
    console.warn(`[WARN] Missing ${name}, using fallback`);
    return fallback;
  }
  return v;
}

const JWT_SECRET = requireEnv("JWT_SECRET", "dev-secret");
const DATABASE_URL = requireEnv("DATABASE_URL", "postgres://localhost:5432/dev");
const OPENAI_API_KEY = requireEnv("OPENAI_API_KEY", "dummy");

void JWT_SECRET;
void DATABASE_URL;
void OPENAI_API_KEY;

export function createApp() {
  const app = express();

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(express.json());

  app.use(requestId);

  app.use(
    cors({
      origin: true,
      credentials: false,
    }),
  );

  app.use("/api/public", publicRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/private", requireAuth, privateRoutes);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: "INVALID_JSON" });
    }

    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  });

  app.use((_req, res) => {
    return res.status(404).json({ error: "NOT_FOUND" });
  });

  return app;
}

export const buildAppWithApiRoutes = createApp;

export const app = createApp();

export default createApp;
