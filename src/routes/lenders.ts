import { Router } from "express";
import requireAuth, { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.LENDERS_READ]));

router.get("/", (_req, res) => {
  res.json({ lenders: [] });
});

export default router;
