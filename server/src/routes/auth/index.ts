import { Router } from "express";

const router = Router();

/**
 * Minimal auth routes placeholder to satisfy imports.
 * Your real auth handlers (JWT, RBAC, etc.) can replace these later.
 */
router.post("/login", (_req, res) => {
  res.status(501).json({ error: "auth route not implemented on this build" });
});

export default router;
