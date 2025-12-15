import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import authRoutes from "./routes/auth";
import internalRoutes from "./routes/internal";
import publicRoutes from "./routes/public";

import { initDb } from "./db/init";

const app = express();

/* ================================
   CORS — MUST BE FIRST
   ================================ */

const rawOrigins = process.env.CORS_ORIGINS || "";
const allowedOrigins = rawOrigins
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow server-to-server + health checks
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }

      return cb(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* 🔴 THIS WAS MISSING — REQUIRED FOR BROWSERS */
app.options("*", cors());

/* ================================
   MIDDLEWARE
   ================================ */

app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

/* ================================
   ROUTES
   ================================ */

app.use("/api/auth", authRoutes);
app.use("/api/internal", internalRoutes);
app.use("/api/public", publicRoutes);

/* ================================
   BOOT
   ================================ */

const PORT = Number(process.env.PORT) || 8080;

(async () => {
  await initDb();

  app.listen(PORT, () => {
    console.log(`Staff Server running on port ${PORT}`);
  });
})();
