import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { db } from "./services/db";
import authRoutes from "./auth/auth.routes";

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

let envValidated = false;
let dbReady = false;

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
  if (missing.length) {
    console.error("FATAL: Missing env vars:", missing);
    process.exit(1);
  }

  envValidated = true;
}

async function initializeDb() {
  try {
    await db.query("SELECT 1");
    dbReady = true;
  } catch (err) {
    console.error("DB CONNECTION FAILED");
    throw err;
  }
}

async function bootstrap() {
  validateEnv();
  await initializeDb();

  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/api/_int/health", (_req, res) => {
    res.status(200).json({ status: "alive" });
  });

  app.get("/api/_int/ready", (_req, res) => {
    if (!envValidated || !dbReady) {
      return res.status(503).json({ status: "not_ready" });
    }
    return res.status(200).json({ status: "ready" });
  });

  app.use("/api/auth", authRoutes);

  const PORT = Number(process.env.PORT) || 8080;

  app.listen(PORT, () => {
    console.log("=== STAFF SERVER STARTED ===");
    console.log("COMMIT:", process.env.GIT_COMMIT || "unknown");
    console.log("NODE:", process.version);
    console.log("PORT:", PORT);
    console.log("ROUTES:");
    console.log("  /");
    console.log("  /api/_int/health");
    console.log("  /api/_int/ready");
    console.log("  /api/auth/*");
    console.log("DB: CONNECTED");
  });
}

bootstrap().catch(err => {
  console.error("FATAL STARTUP ERROR:", err);
  process.exit(1);
});
