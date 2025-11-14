import "dotenv/config";
import express, { type RequestHandler, Request, Response, NextFunction } from "express";
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

// Local DB
import { db } from "./services/db.js";
import { describeDatabaseUrl } from "./utils/env.js";

// -----------------------------------------------------
// APP INIT
// -----------------------------------------------------
const app = express();
const SERVICE_NAME = "staff-backend";
const PORT = Number(process.env.PORT || 5000);

// -----------------------------------------------------
// ENV VALIDATION
// -----------------------------------------------------
if (!process.env.DATABASE_URL) {
  console.warn("⚠️  Warning: DATABASE_URL is not set. Using in-memory database only.");
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

// Small helper to force TS to accept `.data` on your in-memory tables
const safe = <T>(value: any): T => value as T;

// -----------------------------------------------------
// ROOT ROUTE
// -----------------------------------------------------
app.get("/", (_req: Request, res: Response) => {
  res.send("Staff API is running");
});

// -----------------------------------------------------
// PUBLIC HEALTH
// -----------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: SERVICE_NAME,
    time: new Date().toISOString(),
  });
});

// -----------------------------------------------------
// PUBLIC APPLICATIONS LIST
// -----------------------------------------------------
app.get("/api/applications", (_req: Request, res: Response) => {
  const apps = safe<any[]>(db.applications?.data ?? []);
  res.status(200).json({
    status: "ok",
    applications: apps,
  });
});

// -----------------------------------------------------
// INTERNAL HEALTH & DIAGNOSTICS
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
    node: process.version,
    environment: process.env.NODE_ENV ?? "development",
    commit: process.env.GIT_COMMIT_SHA ?? null,
    buildTime: process.env.BUILD_TIME ?? new Date().toISOString(),
  });
});

app.get("/api/_int/db", (_req, res) => {
  const metadata = describeDatabaseUrl(process.env.DATABASE_URL);

  // Fix type errors by safely reading .data everywhere
  const apps = safe<any[]>(db.applications?.data ?? []);
  const docs = safe<any[]>(db.documents?.data ?? []);
  const lenders = safe<any[]>(db.lenders?.data ?? []);
  const pipeline = safe<any[]>(db.pipeline?.data ?? []);
  const comm = safe<any[]>(db.communications?.data ?? []);
  const notes = safe<any[]>(db.notifications?.data ?? []);
  const users = safe<any[]>(db.users?.data ?? []);
  const audit = safe<any[]>(db.auditLogs ?? []);

  res.status(200).json({
    ok: true,
    service: SERVICE_NAME,
    connection: metadata,
    tables: {
      applications: apps.length,
      documents: docs.length,
      lenders: lenders.length,
      pipeline: pipeline.length,
      communications: comm.length,
      notifications: notes.length,
      users: users.length,
      auditLogs: audit.length,
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

// All silo routes
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
