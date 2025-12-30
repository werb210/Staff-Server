import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import { initDb } from "./services/db";

/* ===========================
   HARD ENV VALIDATION
=========================== */

const REQUIRED_ENV = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

function validateEnv(): void {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("FATAL: missing env vars:", missing);
    process.exit(1);
  }
}

/* ===========================
   BOOTSTRAP
=========================== */

async function bootstrap() {
  validateEnv();
  await initDb();

  const app = express();
  app.disable("x-powered-by");

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  /* ===========================
     ROUTES (FLATTENED)
  =========================== */

  const routes: string[] = [];

  app.get("/", (_req, res) => {
    res.json({ status: "ok" });
  });
  routes.push("GET /");

  app.get("/api/_int/health", (_req, res) => {
    res.json({ alive: true });
  });
  routes.push("GET /api/_int/health");

  app.get("/api/_int/ready", (_req, res) => {
    res.json({ ready: true });
  });
  routes.push("GET /api/_int/ready");

  app.use("/api/auth", authRoutes);
  routes.push("ALL /api/auth/*");

  /* ===========================
     START SERVER
  =========================== */

  const port = Number(process.env.PORT) || 8080;

  app.listen(port, () => {
    console.log("====================================");
    console.log("Staff-Server booted");
    console.log("commit:", process.env.COMMIT_SHA || "unknown");
    console.log("node:", process.version);
    console.log("port:", port);
    console.log("mounted routes:");
    routes.forEach((r) => console.log(" -", r));
    console.log("====================================");
  });
}

/* ===========================
   FAIL FAST
=========================== */

bootstrap().catch((err) => {
  console.error("FATAL: bootstrap failed");
  console.error(err);
  process.exit(1);
});
