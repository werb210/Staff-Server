import { Router } from "express";
import { db } from "../../db";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    await db.query("select 1");
    res.json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ status: "db_error" });
  }
});

export default router;
