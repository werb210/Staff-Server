import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./auth/auth.routes";
import { authenticateRequest } from "./auth/auth.middleware";
import { initDb } from "./services/db";
import { initializeUserStore } from "./services/user.service";

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGINS ??
  "https://staff.boreal.financial,https://client.boreal.financial"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/* -------------------- CORS -------------------- */
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

/* -------------------- Middleware -------------------- */
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(authenticateRequest);

/* -------------------- Health -------------------- */
app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

/* -------------------- API ROUTES -------------------- */
/**
 * Frontend expects /api/auth/*
 */
app.use("/api/auth", authRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

async function startServer() {
  try {
    await initDb();
    await initializeUserStore();
  } catch (error) {
    console.error("Failed to initialize services", error);
  }

  const port = Number(process.env.PORT) || 3000;

  app.listen(port, "0.0.0.0", () => {
    console.log(`Staff-Server listening on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
