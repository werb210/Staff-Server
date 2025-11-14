import "dotenv/config";
import express, { type RequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import bodyParser from "body-parser";
import morgan from "morgan";

import serverPackageJson from "../package.json" with { type: "json" };

// Routers
import { errorHandler } from "./middlewares/errorHandler.js";
import apiRouter from "./routes/index.js";
import authRouter from "./routes/auth.js";
import contactsRouter from "./routes/contacts.js";
import companiesRouter from "./routes/companies.js";
import dealsRouter from "./routes/deals.js";
import documentsRouter from "./routes/documents.js";
import pipelineRouter from "./routes/pipeline.js";
import communicationRouter from "./routes/communication.js";

// Local in-memory DB + env utilities
import { db } from "./services/db.js";
import { describeDatabaseUrl } from "./utils/env.js";

// -----------------------------------------------------
// APP INIT
// -----------------------------------------------------
const app = express();
const SERVICE_NAME = "staff-backend";
const PORT = Number(process.env.PORT || 5000);

// -----------------------------------------------------
// ENV VALIDATION (NON-FATAL)
// -----------------------------------------------------
if (!process.env.DATABASE_URL) {
  console.warn(
    "⚠️  Warning: DATABASE_URL is not set. Using in-memory database only."
  );
}

// -----------------------------------------------------
// GLOBAL MIDDLEWARE
// -----------------------------------------------------
app.use(cors({ origin: true, credentials: true }));
app.use(helmet() as unknown as RequestHandler);
app.use(compression() as unknown as RequestHandler);
app.use(bodyParser.json({ limit: "25mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("combined"));

// -----------------------------------------------------
// ROOT ROUTE
// -----------------------------------------------------
app.get("/", (_req, res) => {
  res.send("Staff API is running");
});

// -----------------------------------------------------
// PUBLIC HEALTH (for browser / client app compatibility)
// -----------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: SERVICE_NAME,
    time: new Date().toISOString(),
  });
});

// -----------------------------------------------------
// PUBLIC APPLICATIONS LIST (backwards compatibility)
// -----------------------------------------------------
app.get("/api/applications", (_req, res) => {
  res.status(200).json({
    status: "ok",
    applications: db.applications.data || [],
  });
});

// -----------------------------------------------------
// INTERNAL HEALTH + DIAGNOSTICS
// -----------------------------------------------------
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: SERVICE_NAME,
    time: new Date().toISOString(),
  });
});

app.get("/api/_int/build", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: SERVICE_NAME,
    version: serverPackageJson.version ?? "0.0.0",
    environment: process.env.NODE_ENV ?? "development",
    node: process.version,
    commit: process.env.GIT_COMMIT_SHA ?? null,
    buildTime: process.env.BUILD_TIME ?? new Date().toISOString(),
  });
});

app.get("/api/_int/db", (_req, res) => {
  const metadata = describeDatabaseUrl(process.env.DATABASE_URL);

  res.status(200).json({
    ok: true,
    service: SERVICE_NAME,
    connection: metadata,
    tables: {
      applications: db.applications.data.length,
      documents: db.documents.data.length,
      lenders: db.lenders.data.length,
      pipeline: db.pipeline.data.length,
      communications: db.communications.data.length,
      notifications: db.notifications.data.length,
      users: db.users.data.length,
      auditLogs: db.auditLogs.length,
    },
  });
});

app.get("/api/_int/routes", (_req, res) => {
  res.status(200).json({
    ok: true,
    mounted: [
      "/api/health",
      "/api/applications",
      "/api/auth",
      "/api/contacts",
      "/api/companies",
      "/api/deals",
      "/api/pipeline",
      "/api/documents",
      "/api/comm",
      "/api/:silo/applications",
      "/api/:silo/lenders",
      "/api/:silo/pipeline",
      "/api/:silo/notifications"
    ],
  });
});

// -----------------------------------------------------
// API ROUTERS
// -----------------------------------------------------
app.use("/api/auth", authRouter);
app.use("/api/contacts", contactsRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/deals", dealsRouter);
app.use("/api/pipeline", pipelineRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/comm", communicationRouter);

// /api/:silo/*
app.use("/api", apiRouter);

// -----------------------------------------------------
// GLOBAL ERROR HANDLER
// -----------------------------------------------------
app.use(errorHandler);

// -----------------------------------------------------
// START SERVER
// -----------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Staff API running on port ${PORT}`);
});

export default app;
