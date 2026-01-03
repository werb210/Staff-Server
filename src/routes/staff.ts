import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.use(requireAuth);
router.use(requireRole("staff"));

router.get("/overview", (_req, res) => {
  res.json({ ok: true });
});

export default router;
