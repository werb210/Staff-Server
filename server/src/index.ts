import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";

import healthRouter from "./routes/health.js";
import applicationsRouter from "./routes/applications.js";
import documentsRouter from "./routes/documents.js";
import lendersRouter from "./routes/lenders.js";
import pipelineRouter from "./routes/pipeline.js";
import tasksRouter from "./routes/tasks.js";
import usersRouter from "./routes/users.js";

import applicationCreateRouter from "./routes/api/applications/create.js";
import applicationSubmitRouter from "./routes/api/applications/submit.js";
import applicationUploadRouter from "./routes/api/applications/upload.js";
import applicationCompleteRouter from "./routes/api/applications/complete.js";

import smsRouter from "./routes/api/communication/sms.js";
import emailRouter from "./routes/api/communication/email.js";
import callsRouter from "./routes/api/communication/calls.js";

import sendToLenderRouter from "./routes/api/lenders/send-to-lender.js";
import lenderReportsRouter from "./routes/api/lenders/reports.js";

import marketingAdsRouter from "./routes/api/marketing/ads.js";
import marketingAutomationRouter from "./routes/api/marketing/automation.js";

import retryQueueRouter from "./routes/api/admin/retryQueue.js";
import backupsRouter from "./routes/api/admin/backups.js";

import internalHealthRouter from "./routes/api/_int/health.js";
import buildGuardRouter from "./routes/api/_int/buildGuard.js";

import { loadEnv } from "./utils/env.js";
import { logError, logInfo } from "./utils/logger.js";

loadEnv();

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: "2mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({ message: "OK", service: "Staff API" });
});

app.use("/api/health", healthRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/lenders", lendersRouter);
app.use("/api/pipeline", pipelineRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/users", usersRouter);

app.use("/api/applications/create", applicationCreateRouter);
app.use("/api/applications/submit", applicationSubmitRouter);
app.use("/api/applications/upload", applicationUploadRouter);
app.use("/api/applications/complete", applicationCompleteRouter);

app.use("/api/communication/sms", smsRouter);
app.use("/api/communication/email", emailRouter);
app.use("/api/communication/calls", callsRouter);

app.use("/api/lenders/send-to-lender", sendToLenderRouter);
app.use("/api/lenders/reports", lenderReportsRouter);

app.use("/api/marketing/ads", marketingAdsRouter);
app.use("/api/marketing/automation", marketingAutomationRouter);

app.use("/api/admin/retry-queue", retryQueueRouter);
app.use("/api/admin/backups", backupsRouter);

app.use("/api/_int/health", internalHealthRouter);
app.use("/api/_int/build-guard", buildGuardRouter);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logError("Request error", error);
  const message = error instanceof Error ? error.message : "Unexpected error";
  res.status(400).json({ message });
});

const PORT = Number(process.env.PORT ?? 5000);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    logInfo(`Server listening on port ${PORT}`);
  });
}

export default app;
