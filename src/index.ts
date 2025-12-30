import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { initDb, isDbReady } from "./services/db";
import authRoutes from "./auth/auth.routes";

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
  if (missing.length) {
    console.error("FATAL: Missing env vars:", missing);
    process.exit(1);
  }
}

async function bootstrap() {
  validateEnv();

  await initDb(); // throws on failure

  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  // ROOT
  app.get("/", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // INTERNAL ROUTES
  app.get("/api/_int/health", (_req, res) => {
    res.status(200).json({ status: "alive" });
  });

  app.get("/api/_int/ready", (_req, res) => {
    if (!isDbReady()) {
      return res.status(503).json({ status: "db_not_ready" });
    }
    res.status(200).json({ status: "ready" });
  });

  // AUTH
  app.use("/api/auth", authRoutes);

  const PORT = Number(process.env.PORT) || 8080;

  app.listen(PORT, () => {
    console.log("=== STAFF SERVER STARTED ===");
    console.log("NODE:", process.version);
    console.log("PORT:", PORT);
    console.log("COMMIT:", process.env.GIT_COMMIT || "unknown");
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
