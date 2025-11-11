import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";

import { attachSiloContext } from "./middleware/siloContext.js";
import { authenticateRequest } from "./middleware/authentication.js";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import applicationsRouter from "./routes/applications/index.js";
import documentsRouter from "./routes/documents.js";
import lendersRouter from "./routes/lenders.js";
import lenderProductsRouter from "./routes/lenderProducts.js";
import pipelineRouter from "./routes/pipeline.js";
import tasksRouter from "./routes/tasks.js";
import usersRouter from "./routes/users.js";
import smsRouter from "./routes/communication/sms.js";
import emailRouter from "./routes/communication/email.js";
import callsRouter from "./routes/communication/calls.js";
import marketingAdsRouter from "./routes/marketing/ads.js";
import marketingAutomationRouter from "./routes/marketing/automation.js";
import retryQueueRouter from "./routes/admin/retryQueue.js";
import backupsRouter from "./routes/admin/backups.js";
import ocrInsightsRouter from "./routes/ocrInsights.js";
import aiSummaryRouter from "./routes/aiSummary.js";
import internalHealthRouter from "./routes/internal/health.js";
import buildGuardRouter from "./routes/internal/buildGuard.js";
import { loadEnv } from "./utils/env.js";
import { logError, logInfo } from "./utils/logger.js";

loadEnv();

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({ message: "Staff API", version: "2.0" });
});

app.use("/api", attachSiloContext);
app.use("/api", authenticateRequest);

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/lenders", lendersRouter);
app.use("/api/lender-products", lenderProductsRouter);
app.use("/api/pipeline", pipelineRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/users", usersRouter);
app.use("/api/communication/sms", smsRouter);
app.use("/api/communication/email", emailRouter);
app.use("/api/communication/calls", callsRouter);
app.use("/api/marketing/ads", marketingAdsRouter);
app.use("/api/marketing/automation", marketingAutomationRouter);
app.use("/api/admin/retry-queue", retryQueueRouter);
app.use("/api/admin/backups", backupsRouter);
app.use("/api/ocr-insights", ocrInsightsRouter);
app.use("/api/ai-summary", aiSummaryRouter);
app.use("/api/_int/health", internalHealthRouter);
app.use("/api/_int/build-guard", buildGuardRouter);

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logError("Request error", error);
  const message = error instanceof Error ? error.message : "Unexpected error";
  res.status(500).json({ message });
});

const PORT = Number(process.env.PORT ?? 5000);

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    logInfo(`Server listening on port ${PORT}`);
  });
}

export default app;
