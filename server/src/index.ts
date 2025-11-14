import "dotenv/config";
import express, { type RequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import bodyParser from "body-parser";
import morgan from "morgan";

import serverPackageJson from "../package.json" with { type: "json" };
import { errorHandler } from "./middlewares/errorHandler.js";
import apiRouter from "./routes/index.js";
import authRouter from "./routes/auth.js";
import contactsRouter from "./routes/contacts.js";
import companiesRouter from "./routes/companies.js";
import dealsRouter from "./routes/deals.js";
import documentsRouter from "./routes/documents.js";
import pipelineRouter from "./routes/pipeline.js";
import communicationRouter from "./routes/communication.js";
import { db, type Silo } from "./services/db.js";
import { describeDatabaseUrl } from "./utils/env.js";

// -----------------------------------------------
// EXPRESS APP INITIALIZATION
// -----------------------------------------------
const app = express();
const SERVICE_NAME = "staff-backend";
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

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
// ROOT ROUTE
// -----------------------------------------------
app.get("/", (_req, res) => {
  res.send("Staff API is running");
});

// -----------------------------------------------
// HELPERS
// -----------------------------------------------
const resolveBuildCommit = () =>
  process.env.GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.COMMIT_HASH ??
  null;

const summariseSiloTables = (records: Record<Silo, { data: unknown[] }>) =>
  Object.fromEntries(
    (Object.entries(records) as [Silo, { data: unknown[] }][]).map(
      ([silo, table]) => [silo, table.data.length]
    )
  );

// -----------------------------------------------
// INTERNAL HEALTH CHECKS
// -----------------------------------------------
app.get("/api/_int/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    time: new Date().toISOString(),
    service: SERVICE_NAME,
  });
});

app.get("/api/_int/build", (_req, res) => {
  res.status(200).json({
    ok: true,
    service: SERVICE_NAME,
    version: serverPackageJson.version ?? "0.0.0",
    environment: process.env.NODE_ENV ?? "development",
    node: process.version,
    commit: resolveBuildCommit(),
    buildTime: process.env.BUILD_TIME ?? new Date().toISOString(),
  });
});

app.get("/api/_int/db", (_req, res) => {
  const metadata = describeDatabaseUrl(process.env.DATABASE_URL);

  if (metadata.status !== "ok") {
    res.status(500).json({
      ok: false,
      service: SERVICE_NAME,
      status: metadata.status,
      message:
        metadata.status === "missing"
          ? "DATABASE_URL is not configured"
          : "DATABASE_URL is invalid",
    });
    return;
  }

  res.status(200).json({
    ok: true,
    service: SERVICE_NAME,
    connection: {
      driver: metadata.driver,
      url: metadata.sanitizedUrl,
      host: metadata.host,
      port: metadata.port,
    },
    tables: {
      applications: summariseSiloTables(db.applications),
      documents: summariseSiloTables(db.documents),
      lenders: summariseSiloTables(db.lenders),
      pipeline: summariseSiloTables(db.pipeline),
      communications: summariseSiloTables(db.communications),
      notifications: summariseSiloTables(db.notifications),
      users: db.users.data.length,
      auditLogs: db.auditLogs.length,
    },
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
// MAIN API ROUTER
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
