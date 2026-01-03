import { Router } from "express";
import { checkDb } from "../db";

const router = Router();

router.get("/ready", async (_req, res) => {
  await checkDb();
  res.json({ ok: true });
});

export default router;
