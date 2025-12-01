import express from "express";

import applicationsRoutes from "./applications.routes.js";
import authRoutes from "./auth.routes.js";
import companiesRoutes from "./companies.routes.js";
import contactsRoutes from "./contacts.routes.js";
import dealsRoutes from "./deals.routes.js";
import documentsRoutes from "./documents.routes.js";
import financialsRoutes from "./financialsRoutes.js";
import healthRoutes from "./health.routes.js";
import lenderMatchRoutes from "./lenders.js";
import lendersRoutes from "./lenders.routes.js";
import notificationsRoutes from "./notifications.routes.js";
import communicationsRoutes from "./communications.routes.js";
import pipelineRoutes from "./pipeline.routes.js";
import searchRoutes from "./search.routes.js";
import tagsRoutes from "./tags.routes.js";
import bankingRoutes from "./banking.js";
import ocrRoutes from "./ocr.js";
import usersRoutes from "./users.routes.js";
import aiRoutes from "./ai.routes.js";
import { authGuard, roleGuard } from "../middlewares/index.js";

const staffRoles = ["ADMIN", "STAFF"] as const;
const adminRoles = ["ADMIN"] as const;
const lenderRoles = ["LENDER"] as const;
const referrerRoles = ["REFERRER"] as const;

const router = express.Router();

router.use("/_int", healthRoutes);
router.get("/_int/live", (req, res) => {
  res.json({
    ok: true,
    service: "staff-server",
    dbReady: Boolean(req.app.locals.dbReady),
    uptime: process.uptime(),
  });
});

router.use("/auth", authRoutes);
router.use("/users", authGuard, roleGuard([...adminRoles]), usersRoutes);
router.use("/companies", authGuard, roleGuard([...staffRoles]), companiesRoutes);
router.use("/contacts", authGuard, roleGuard([...staffRoles]), contactsRoutes);
router.use("/deals", authGuard, roleGuard([...staffRoles]), dealsRoutes);
router.use("/documents", authGuard, roleGuard([...staffRoles]), documentsRoutes);
router.use("/financials", authGuard, roleGuard([...staffRoles]), financialsRoutes);
router.use("/banking", authGuard, roleGuard([...staffRoles]), bankingRoutes);
router.use("/lenders", authGuard, roleGuard([...staffRoles, ...lenderRoles]), lenderMatchRoutes);
router.use("/lenders", authGuard, roleGuard([...staffRoles, ...lenderRoles]), lendersRoutes);
router.use("/pipeline", authGuard, roleGuard([...staffRoles]), pipelineRoutes);
router.use("/notifications", authGuard, roleGuard([...staffRoles]), notificationsRoutes);
router.use("/communications", authGuard, roleGuard([...staffRoles]), communicationsRoutes);
router.use(
  "/applications",
  authGuard,
  roleGuard([...staffRoles, ...referrerRoles]),
  applicationsRoutes,
);
router.use("/ocr", authGuard, roleGuard([...staffRoles]), ocrRoutes);
router.use("/search", authGuard, roleGuard([...staffRoles]), searchRoutes);
router.use("/tags", authGuard, roleGuard([...staffRoles]), tagsRoutes);
router.use("/ai", authGuard, roleGuard([...staffRoles]), aiRoutes);

export default router;
