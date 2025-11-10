/**
 * Main Express server entrypoint
 * Mounts all routers and starts the server
 */

import express, { Application as ExpressApp } from "express";
import cors from "cors";
import bodyParser from "body-parser";

import { loadEnvironment } from "./utils/env.js";
import { logInfo } from "./utils/logger.js";

// Top-level routers
import healthRouter from "./routes/health.js";
import applicationsRouter from "./routes/applications.js";
import documentsRouter from "./routes/documents.js";
import lendersRouter from "./routes/lenders.js";
import tasksRouter from "./routes/tasks.js";
import usersRouter from "./routes/users.js";
import pipelineRouter from "./routes/pipeline.js";

// API modular routers (Codex-generated)
import createApplicationRouter from "./routes/api/applications/create.js";
import submitApplicationRouter from "./routes/api/applications/submit.js";
import uploadApplicationDocumentRouter from "./routes/api/applications/upload.js";
import completeApplicationRouter from "./routes/api/applications/complete.js";

import sendToLenderRouter from "./routes/api/lenders/send-to-lender.js";
import lenderReportsRouter from "./routes/api/lenders/reports.js";
import lenderProductsRouter from "./routes/api/lenderProducts.js";
import publicApplicationsRouter from "./routes/api/publicApplications.js";

import documentRequirementsRouter from "./routes/api/documentRequirements.js";
import ocrInsightsRouter from "./routes/api/ocrInsights.js";
import aiSummaryRouter from "./routes/api/aiSummary.js";

import smsRouter from "./routes/api/communication/sms.js";
import emailRouter from "./routes/api/communication/email.js";
import callsRouter from "./routes/api/communication/calls.js";

import marketingAdsRouter from "./routes/api/marketing/ads.js";
import marketingAutomationRouter from "./routes/api/marketing/automation.js";

import retryQueueRouter from "./routes/api/admin/retryQueue.js";
import backupsRouter from "./routes/api/admin/backups.js";

import internalHealthRouter from "./routes/api/_int/health.js";
import buildGuardRouter from "./routes/api/_int/buildGuard.js";

loadEnvironment();

// Create Express app
const app: ExpressApp = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Mount top-level routers
app.use("/api/health", healthRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/lenders", lendersRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/users", usersRouter);
app.use("/api/pipeline", pipelineRouter);

// Mount modular /api routes
app.use("/api/applications/create", createApplicationRouter);
app.use("/api/applications/submit", submitApplicationRouter);
app.use("/api/applications/upload", uploadApplicationDocumentRouter);
app.use("/api/applications/complete", completeApplicationRouter);

app.use("/api/lenders/send-to-lender", sendToLenderRouter);
app.use("/api/lenders/reports", lenderReportsRouter);
app.use("/api/lender-products", lenderProductsRouter);
app.use("/api/public-applications", publicApplicationsRouter);

app.use("/api/document-requirements", documentRequirementsRouter);
app.use("/api/ocr-insights", ocrInsightsRouter);
app.use("/api/ai-summary", aiSummaryRouter);

app.use("/api/communication/sms", smsRouter);
app.use("/api/communication/email", emailRouter);
app.use("/api/communication/calls", callsRouter);

app.use("/api/marketing/ads", marketingAdsRouter);
app.use("/api/marketing/automation", marketingAutomationRouter);

app.use("/api/admin/retry-queue", retryQueueRouter);
app.use("/api/admin/backups", backupsRouter);

app.use("/api/_int/health", internalHealthRouter);
app.use("/api/_int/build-guard", buildGuardRouter);

// Start server
const PORT = Number(process.env.PORT ?? 5000);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    logInfo(`Server listening on port ${PORT}`);
  });
}

export default app;
