import { Router } from "express";
import requireAuth, { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.MARKETING_READ]));

router.get("/", (_req, res) => {
  res.json({ ok: true });
});

router.get("/campaigns", (_req, res) => {
  res.json({ campaigns: [] });
});

export default router;
