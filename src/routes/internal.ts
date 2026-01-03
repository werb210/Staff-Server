import { Router } from "express";
import { dbWarm } from "../db";

const router = Router();

router.get("/ready", async (_req, res) => {
  try {
    await dbWarm();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

export default router;
