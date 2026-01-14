import { Router } from "express";
import requireAuth, { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { safeHandler } from "../middleware/safeHandler";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.SETTINGS_READ]));

router.get("/", safeHandler((_req, res) => {
  res.json({ ok: true });
}));

router.get("/preferences", safeHandler((_req, res) => {
  res.json({ preferences: {} });
}));

router.get("/me", safeHandler((req, res) => {
  res.json({
    userId: req.user?.userId ?? null,
    role: req.user?.role ?? null,
    phone: req.user?.phone ?? null,
  });
}));

export default router;
