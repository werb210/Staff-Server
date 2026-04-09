import crypto from "node:crypto";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", async (_req, res) => {
  const applicationId = crypto.randomUUID();
  return res.status(201).json({ status: "ok", data: { applicationId } });
});

router.get("/:id", requireAuth, async (req, res) => {
  return res.json({ status: "ok", data: { id: req.params.id } });
});

export default router;
