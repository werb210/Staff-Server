import { Router } from "express";
import requireAuth, { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.CALENDAR_READ]));

router.get("/", (_req, res) => {
  res.json({ ok: true });
});

router.get("/tasks", (_req, res) => {
  res.json({ tasks: [] });
});

export default router;
