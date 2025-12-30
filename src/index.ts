import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { initDb, isDbReady } from "./services/db";
import authRoutes from "./routes/auth.routes";

const REQUIRED_ENV = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

function validateEnv() {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("FATAL missing env:", missing);
    process.exit(1);
  }
}

async function main() {
  validateEnv();

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  /* ROOT */
  app.get("/", (_req, res) => res.status(200).json({ ok: true }));

  /* HEALTH — Azure hits /health */
  app.get("/health", (_req, res) =>
    res.status(200).json({ alive: true })
  );

  /* INTERNAL HEALTH */
  app.get("/api/_int/health", (_req, res) =>
    res.status(200).json({ alive: true })
  );

  /* READY — DB + ENV */
  app.get("/api/_int/ready", (_req, res) => {
    if (!isDbReady()) {
      return res.status(503).json({ ready: false });
    }
    res.status(200).json({ ready: true });
  });

  /* AUTH */
  app.use("/api/auth", authRoutes);

  await initDb();

  const port = Number(process.env.PORT || 8080);
  app.listen(port, () => {
    console.log("SERVER LISTENING on", port);
  });
}

main().catch((err) => {
  console.error("FATAL BOOT ERROR", err);
  process.exit(1);
});
