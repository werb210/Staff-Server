import { Router } from "express";
import requireAuth, { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.SETTINGS_READ]));

router.get("/", (_req, res) => {
  res.json({ ok: true });
});

router.get("/preferences", (_req, res) => {
  res.json({ preferences: {} });
});

export default router;
