import { Router } from "express";

const router = Router();

/**
 * GET /api/_int/health
 */
router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * GET /api/_int/build
 */
router.get("/build", (_req, res) => {
  res.status(200).json({
    name: "staff-server",
    env: process.env.NODE_ENV ?? "unknown",
    timestamp: new Date().toISOString(),
  });
});

export default router;
