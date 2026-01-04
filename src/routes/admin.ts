import { Router } from "express";
import { requireAuth, requireCapability } from "../middleware/auth";
import { adminRateLimit } from "../middleware/rateLimit";
import { CAPABILITIES } from "../auth/capabilities";
import auditRoutes from "../modules/audit/audit.routes";
import lenderAdminRoutes from "../modules/lender/lender.admin.routes";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.AUDIT_VIEW]));
router.use(adminRateLimit());
router.use("/audit", auditRoutes);
router.use("/", lenderAdminRoutes);

export default router;
