// Auto-generated stub by Codex
// Stub router for GET /api/applications

import { Router } from "express";

const router = Router();

// Existing GET handler
router.get("/", (_req, res) => {
  res.json({ message: "OK" });
});

// Add POST handler for testing
router.post("/", (req, res) => {
  res.json({ message: "OK" });
});

export default router;
