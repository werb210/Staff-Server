import { Router } from "express";

const router = Router();

/**
 * POST /api/auth/login
 */
router.post("/login", (_req, res) => {
  res.status(501).json({ error: "not implemented" });
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", (_req, res) => {
  res.status(501).json({ error: "not implemented" });
});

/**
 * GET /api/auth/me
 */
router.get("/me", (_req, res) => {
  res.status(501).json({ error: "not implemented" });
});

export default router;
