import { Router } from "express";

const router = Router();

/**
 * GET /api/health
 * Must be fast. No DB. No async.
 */
router.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
