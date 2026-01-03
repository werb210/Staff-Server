import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { permissions } from "../auth/roles";

const router = Router();

router.use(requireAuth);
router.use(requireRole(permissions.staffRoutes));

router.get("/overview", (_req, res) => {
  res.json({ ok: true });
});

export default router;
