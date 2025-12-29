import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import authRoutes from "./auth/auth.routes";
import { authenticateRequest } from "./auth/auth.middleware";
import intRoutes from "./routes/_int.routes";
import { initDb } from "./services/db";
import { initializeUserStore } from "./services/user.service";

dotenv.config();

const app = express();

async function bootstrap() {
  await initDb();
  await initializeUserStore();

  /* ---------- CORE MIDDLEWARE ---------- */
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(authenticateRequest);

  /* ---------- HEALTH (AZURE) ---------- */
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  /* ---------- ROOT (PREVENT CANNOT GET /) ---------- */
  app.get("/", (_req, res) => {
    res.status(200).send("Staff Server Online");
  });

  /* ---------- ROUTES ---------- */
  app.use("/auth", authRoutes);
  app.use("/", intRoutes);

  /* ---------- HARD FAIL PROTECTION ---------- */
  process.on("unhandledRejection", (err) => {
    console.error("UNHANDLED REJECTION:", err);
  });

  process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
  });

  /* ---------- START ---------- */
  const PORT = Number(process.env.PORT) || 8080;
  app.listen(PORT, () => {
    console.log(`Staff-Server running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
