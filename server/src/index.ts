import "dotenv/config";
import express, { type RequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import bodyParser from "body-parser";
import morgan from "morgan";

import { errorHandler } from "./middlewares/errorHandler.js";
import apiRouter from "./routes/index.js";
import authRouter from "./routes/auth.js";
import contactsRouter from "./routes/contacts.js";
import companiesRouter from "./routes/companies.js";
import dealsRouter from "./routes/deals.js";
import documentsRouter from "./routes/documents.js";
import pipelineRouter from "./routes/pipeline.js";
import communicationRouter from "./routes/communication.js";

// -----------------------------------------------
// EXPRESS APP INITIALIZATION
// -----------------------------------------------
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

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
app.use(helmet() as unknown as RequestHandler);
app.use(compression() as unknown as RequestHandler);
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
      "/api/auth",
      "/api/contacts",
      "/api/companies",
      "/api/deals",
      "/api/:silo/applications",
      "/api/:silo/lenders",
      "/api/:silo/pipeline",
      "/api/:silo/notifications",
      "/api/documents",
      "/api/comm",
    ],
  });
});

// -----------------------------------------------
// MAIN API ROUTER (silo-aware)
// -----------------------------------------------
app.use("/api/auth", authRouter);
app.use("/api/contacts", contactsRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/deals", dealsRouter);
app.use("/api/pipeline", pipelineRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/comm", communicationRouter);
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
