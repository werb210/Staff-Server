import { Router } from "express";
import { requireAuth, requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import auditRoutes from "../modules/audit/audit.routes";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.AUDIT_VIEW]));
router.use("/audit", auditRoutes);

export default router;
