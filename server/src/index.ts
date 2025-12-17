import express from "express";
import helmet from "helmet";
import cors from "cors";
import dotenv from "dotenv";

import { registerRoutes } from "./routes";

dotenv.config();

const app = express();

/**
 * SECURITY
 */
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

/**
 * CORS — FIXED
 * Explicit allow-list. No wildcards. Credentials supported.
 */
app.use(
  cors({
    origin: [
      "https://staff.boreal.financial",
      "https://server.boreal.financial",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    exposedHeaders: ["Authorization"],
  })
);

/**
 * BODY PARSING
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * ROUTES
 */
registerRoutes(app);

/**
 * FALLBACK
 */
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

/**
 * BOOT
 */
const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});
