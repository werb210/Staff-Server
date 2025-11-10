// Auto-generated stub by Codex
// Stub router for GET /api/_int/health

import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ message: "OK" });
});

export default router;
