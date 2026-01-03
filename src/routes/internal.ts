import { Router } from "express";
import { checkDb } from "../db";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/ready", async (_req, res) => {
  try {
    await checkDb();
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

export default router;
