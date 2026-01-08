import { Router } from "express";

import adminRoutes from "./routes/admin";
import applicationsRoutes from "./routes/applications";
import authRoutes from "./routes/auth";
import clientRoutes from "./routes/client";
import internalRoutes from "./routes/internal";
import lenderRoutes from "./routes/lender";
import reportingRoutes from "./routes/reporting";
import reportsRoutes from "./routes/reports";
import staffRoutes from "./routes/staff";
import usersRoutes from "./routes/users";
import { errorHandler, notFoundHandler } from "./middleware/errors";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { responseSerializer } from "./middleware/responseSerializer";
import { enforceSecureCookies, requireHttps } from "./middleware/security";

const router = Router();

router.use(responseSerializer);
router.use(requestId);
router.use(requestLogger);
router.use(requireHttps);
router.use(enforceSecureCookies);

router.use("/_int", internalRoutes);
router.use("/auth", authRoutes);
router.use("/applications", applicationsRoutes);
router.use("/client", clientRoutes);
router.use("/lender", lenderRoutes);
router.use("/admin", adminRoutes);
router.use("/reporting", reportingRoutes);
router.use("/reports", reportsRoutes);
router.use("/staff", staffRoutes);
router.use("/users", usersRoutes);

router.use(notFoundHandler);
router.use(errorHandler);

export default router;
