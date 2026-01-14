import { Router } from "express";
import requireAuth, { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { safeHandler } from "../middleware/safeHandler";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.CRM_READ]));

router.get("/", safeHandler((_req, res) => {
  res.json({ ok: true });
}));

router.get("/customers", safeHandler((_req, res) => {
  res.json({ customers: [] });
}));

router.get("/contacts", safeHandler((_req, res) => {
  res.json({ contacts: [] });
}));

export default router;
