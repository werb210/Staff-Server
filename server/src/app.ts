import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import applicationsRoutes from "./routes/applications.routes";
import authRoutes from "./routes/auth.routes";
import companiesRoutes from "./routes/companies.routes";
import contactsRoutes from "./routes/contacts.routes";
import dealsRoutes from "./routes/deals.routes";
import documentsRoutes from "./routes/documents.routes";
import financialsRoutes from "./routes/financialsRoutes";
import healthRoutes from "./routes/health.routes";
import lendersRoutes from "./routes/lenders.routes";
import notificationsRoutes from "./routes/notifications.routes";
import communicationsRoutes from "./routes/communications.routes";
import pipelineRoutes from "./routes/pipeline.routes";
import searchRoutes from "./routes/search.routes";
import tagsRoutes from "./routes/tags.routes";
import ocrRoutes from "./routes/ocr.routes";
import usersRoutes from "./routes/users.routes";
import aiRoutes from "./routes/ai.routes";

import { errorHandler } from "./middlewares/errorHandler";

export const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api/_int", healthRoutes);
app.get("/api/_int/live", (_req, res) => {
  res.json({
    ok: true,
    service: "staff-server",
    dbReady: Boolean(app.locals.dbReady),
    uptime: process.uptime(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/companies", companiesRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/deals", dealsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/financials", financialsRoutes);
app.use("/api/lenders", lendersRoutes);
app.use("/api/pipeline", pipelineRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/communications", communicationsRoutes);
app.use("/api/applications", applicationsRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/ai", aiRoutes);

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

app.use(errorHandler);
