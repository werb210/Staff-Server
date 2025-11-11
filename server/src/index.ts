import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import bodyParser from "body-parser";

import healthRouter from "./routes/health.js";
import applicationsRouter from "./routes/applications.js";
import documentsRouter from "./routes/documents.js";
import lendersRouter from "./routes/lenders.js";
import communicationRouter from "./routes/communication.js";
import marketingRouter from "./routes/marketing.js";
import adminRouter from "./routes/admin.js";
import pipelineRouter from "./routes/pipeline.js";
import office365Router from "./routes/office365.js";
import linkedinRouter from "./routes/linkedin.js";

import { logError, logInfo } from "./utils/logger.js";
import { loadEnv } from "./utils/env.js";

loadEnv();

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: "2mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({ message: "OK", service: "Boreal Staff App API" });
});

app.use("/api/health", healthRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/lenders", lendersRouter);
app.use("/api/communication", communicationRouter);
app.use("/api/marketing", marketingRouter);
app.use("/api/admin", adminRouter);
app.use("/api/pipeline", pipelineRouter);
app.use("/api/office365", office365Router);
app.use("/api/linkedin", linkedinRouter);

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
