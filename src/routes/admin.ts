import { Router } from "express";
import requireAuth, { requireCapability } from "../middleware/auth";
import { adminRateLimit } from "../middleware/rateLimit";
import { CAPABILITIES } from "../auth/capabilities";
import auditRoutes from "../modules/audit/audit.routes";
import lenderAdminRoutes from "../modules/lender/lender.admin.routes";
import ocrAdminRoutes from "../modules/ocr/ocr.admin.routes";
import adminOpsRoutes from "./admin.ops";
import adminExportsRoutes from "./admin.exports";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.AUDIT_VIEW]));
router.use(adminRateLimit());
router.use("/audit", auditRoutes);
router.use("/ops", adminOpsRoutes);
router.use("/exports", adminExportsRoutes);
router.use("/ocr", ocrAdminRoutes);
router.use("/", lenderAdminRoutes);

export default router;
