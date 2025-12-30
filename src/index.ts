import "dotenv/config";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./auth/auth.routes";
import internalRoutes from "./routes/internal.routes";
import { initDb } from "./services/db";

const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
] as const;

function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
}

async function bootstrap() {
  validateEnv();
  await initDb();

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

  app.use("/api/auth", authRoutes);
  app.use("/api/_int", internalRoutes);

  const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

  app.listen(PORT, () => {
    console.log(`Staff-Server listening on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
