import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes";
import { requireAuth } from "../middleware/requireAuth";
import { notFoundHandler } from "../middleware/errors";
import { errorHandler } from "../middleware/errorHandler";

const router = Router();
router.get("/me", requireAuth, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: "missing_token" });
  }
  return res.json({
    ok: true,
    user: {
      id: req.user.userId,
      role: req.user.role,
    },
  });
});
router.use("/", authRoutes);
router.use(notFoundHandler);
router.use(errorHandler);

export default router;
