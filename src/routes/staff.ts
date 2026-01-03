import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { ROLES } from "../auth/roles";

const router = Router();

router.use(requireAuth);
router.use(requireRole(ROLES.STAFF));

router.get("/overview", (_req, res) => {
  res.json({ ok: true });
});

export default router;
