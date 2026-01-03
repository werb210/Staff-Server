import { Router } from "express";
import { dbWarm, checkDb } from "../db";

const router = Router();

router.get("/_int/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/_int/ready", async (_req, res) => {
  await checkDb();
  res.json({ ok: true });
});

router.get("/_int/warm", async (_req, res) => {
  await dbWarm();
  res.json({ ok: true });
});

export default router;
