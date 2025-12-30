import "dotenv/config";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./auth/auth.routes";
import { checkDbConnection, initDb } from "./services/db";

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter(
    (key: RequiredEnvVar) => !process.env[key],
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

function getCommitHash(): string {
  return (
    process.env.COMMIT_SHA ||
    process.env.GIT_COMMIT ||
    process.env.SOURCE_VERSION ||
    "unknown"
  );
}

async function buildApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  app.use(
    cors({
      origin: [
        "https://staff.boreal.financial",
        "https://api.staff.boreal.financial",
      ],
      credentials: true,
    }),
  );

  app.get("/", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/api/_int/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/api/_int/ready", async (_req, res) => {
    try {
      await checkDbConnection();
      return res.status(200).json({ status: "ready" });
    } catch (error) {
      return res.status(503).json({
        status: "not_ready",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.use("/api/auth", authRoutes);

  return app;
}

async function startServer() {
  validateEnv();
  await initDb();

  const app = await buildApp();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
  const mountedRoutes = [
    "GET /",
    "GET /api/_int/health",
    "GET /api/_int/ready",
    "POST /api/auth/login",
    "POST /api/auth/logout",
    "POST /api/auth/refresh",
    "GET /api/auth/me",
    "GET /api/auth/status",
  ];

  app.listen(PORT, () => {
    const startupLog = {
      commit: getCommitHash(),
      node: process.version,
      port: PORT,
      routes: mountedRoutes,
      db: "connected",
    };

    console.log(`[startup] ${JSON.stringify(startupLog)}`);
  });
}

startServer().catch((error) => {
  console.error("[fatal] Failed to start server", error);
  process.exit(1);
});
