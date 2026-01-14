import { Router } from "express";
import requireAuth, { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { safeHandler } from "../middleware/safeHandler";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.COMMUNICATIONS_READ]));

router.get("/", safeHandler((_req, res) => {
  res.json({ ok: true });
}));

router.get("/messages", safeHandler((_req, res) => {
  res.json({ messages: [] });
}));

export default router;
