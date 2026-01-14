import { Router } from "express";

import adminRoutes from "./routes/admin";
import applicationsRoutes from "./routes/applications";
import authRoutes from "./routes/auth";
import calendarRoutes from "./routes/calendar";
import clientRoutes from "./routes/client";
import communicationsRoutes from "./routes/communications";
import crmRoutes from "./routes/crm";
import internalRoutes from "./routes/internal";
import lenderRoutes from "./routes/lender";
import lendersRoutes from "./routes/lenders";
import marketingRoutes from "./routes/marketing";
import reportingRoutes from "./routes/reporting";
import reportsRoutes from "./routes/reports";
import settingsRoutes from "./routes/settings";
import staffRoutes from "./routes/staff";
import usersRoutes from "./routes/users";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import { enforceSecureCookies, requireHttps } from "./middleware/security";
import { idempotencyMiddleware } from "./middleware/idempotency";

const router = Router();

router.use(requireHttps);
router.use(enforceSecureCookies);
router.use(idempotencyMiddleware);

router.use("/_int", internalRoutes);
router.use("/auth", authRoutes);
router.use("/applications", applicationsRoutes);
router.use("/calendar", calendarRoutes);
router.use("/client", clientRoutes);
router.use("/communications", communicationsRoutes);
router.use("/crm", crmRoutes);
router.use("/lender", lenderRoutes);
router.use("/lenders", lendersRoutes);
router.use("/admin", adminRoutes);
router.use("/marketing", marketingRoutes);
router.use("/reporting", reportingRoutes);
router.use("/reports", reportsRoutes);
router.use("/settings", settingsRoutes);
router.use("/staff", staffRoutes);
router.use("/users", usersRoutes);

router.use(notFoundHandler);
router.use(errorHandler);

export default router;
