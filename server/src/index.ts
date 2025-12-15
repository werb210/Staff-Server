import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRouter from "./routes/auth/index";
import publicRouter from "./routes/public/index";
import internalRouter from "./routes/internal/index";

const app = express();

/**
 * CORS — MUST be before ANY routes
 */
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS blocked"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

/**
 * Core middleware
 */
app.use(express.json());
app.use(morgan("dev"));

/**
 * Routes
 */
app.use("/api/auth", authRouter);
app.use("/api/public", publicRouter);
app.use("/api/internal", internalRouter);

/**
 * Health
 */
app.get("/api/public/health", (_req, res) => {
  res.json({ status: "ok" });
});

/**
 * Start
 */
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});
