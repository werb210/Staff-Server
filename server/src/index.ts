import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import bodyParser from "body-parser";
import morgan from "morgan";

import { errorHandler } from "./middlewares/errorHandler.js";
import apiRouter from "./routes/index.js";

// -----------------------------------------------
// EXPRESS APP INITIALIZATION
// -----------------------------------------------
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

// -----------------------------------------------
// REQUIRED ENV VALIDATION
// -----------------------------------------------
const requiredEnv = ["DATABASE_URL"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    process.exit(1);
  }
}

// -----------------------------------------------
// GLOBAL MIDDLEWARE
// -----------------------------------------------
app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
app.use(compression());
app.use(bodyParser.json({ limit: "25mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("combined"));

// -----------------------------------------------
// INTERNAL HEALTH CHECKS
// -----------------------------------------------
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    service: "staff-backend",
  });
});

app.get("/api/_int/routes", (_req, res) => {
  res.status(200).json({
    ok: true,
    mounted: [
      "/api/:silo/applications",
      "/api/:silo/documents",
      "/api/:silo/lenders",
      "/api/:silo/pipeline",
      "/api/:silo/communications",
      "/api/:silo/notifications",
    ],
  });
});

// -----------------------------------------------
// MAIN API ROUTER (silo-aware)
// -----------------------------------------------
app.use("/api", apiRouter);

// -----------------------------------------------
// GLOBAL ERROR HANDLER
// -----------------------------------------------
app.use(errorHandler);

// -----------------------------------------------
// SERVER START
// -----------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Staff API running on port ${PORT}`);
});
