import { Router } from "express";
import requireAuth, { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { safeHandler } from "../middleware/safeHandler";
import { respondOk } from "../utils/respondOk";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.STAFF_OVERVIEW]));

router.get("/", safeHandler((_req, res) => {
  respondOk(res, { widgets: [], alerts: [] });
}));

export default router;
