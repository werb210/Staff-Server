import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

import applicationsRoutes from "./routes/applications.routes.js";
import authRoutes from "./routes/auth.routes.js";
import companiesRoutes from "./routes/companies.routes.js";
import contactsRoutes from "./routes/contacts.routes.js";
import dealsRoutes from "./routes/deals.routes.js";
import documentsRoutes from "./routes/documents.routes.js";
import financialsRoutes from "./routes/financialsRoutes.js";
import healthRoutes from "./routes/health.routes.js";
import lenderMatchRoutes from "./routes/lenders.js";
import lendersRoutes from "./routes/lenders.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import communicationsRoutes from "./routes/communications.routes.js";
import pipelineRoutes from "./routes/pipeline.routes.js";
import searchRoutes from "./routes/search.routes.js";
import tagsRoutes from "./routes/tags.routes.js";
import bankingRoutes from "./routes/banking.js";
import ocrRoutes from "./routes/ocr.js";
import usersRoutes from "./routes/users.routes.js";
import aiRoutes from "./routes/ai.routes.js";

import { errorHandler } from "./middlewares/errorHandler.js";
import { authGuard, roleGuard } from "./middlewares/index.js";

const staffRoles = ["ADMIN", "STAFF"] as const;
const adminRoles = ["ADMIN"] as const;
const lenderRoles = ["LENDER"] as const;
const referrerRoles = ["REFERRER"] as const;

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
app.use("/api/users", authGuard, roleGuard([...adminRoles]), usersRoutes);
app.use("/api/companies", authGuard, roleGuard([...staffRoles]), companiesRoutes);
app.use("/api/contacts", authGuard, roleGuard([...staffRoles]), contactsRoutes);
app.use("/api/deals", authGuard, roleGuard([...staffRoles]), dealsRoutes);
app.use("/api/documents", authGuard, roleGuard([...staffRoles]), documentsRoutes);
app.use("/api/financials", authGuard, roleGuard([...staffRoles]), financialsRoutes);
app.use("/api/banking", authGuard, roleGuard([...staffRoles]), bankingRoutes);
app.use("/api/lenders", authGuard, roleGuard([...staffRoles, ...lenderRoles]), lenderMatchRoutes);
app.use("/api/lenders", authGuard, roleGuard([...staffRoles, ...lenderRoles]), lendersRoutes);
app.use("/api/pipeline", authGuard, roleGuard([...staffRoles]), pipelineRoutes);
app.use("/api/notifications", authGuard, roleGuard([...staffRoles]), notificationsRoutes);
app.use("/api/communications", authGuard, roleGuard([...staffRoles]), communicationsRoutes);
app.use("/api/applications", authGuard, roleGuard([...staffRoles, ...referrerRoles]), applicationsRoutes);
app.use("/api/ocr", authGuard, roleGuard([...staffRoles]), ocrRoutes);
app.use("/api/search", authGuard, roleGuard([...staffRoles]), searchRoutes);
app.use("/api/tags", authGuard, roleGuard([...staffRoles]), tagsRoutes);
app.use("/api/ai", authGuard, roleGuard([...staffRoles]), aiRoutes);

app.use((req, res) => {
  res.status(404).json({ ok: false, error: "Not found" });
});

app.use(errorHandler);
