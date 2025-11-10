// Auto-generated stub by Codex
// Stub router for GET /api/health

import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
