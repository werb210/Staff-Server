import { Router } from "express";
import { db } from "../../db";

const router = Router();

/**
 * INTERNAL DB HEALTH CHECK
 * NOT public
 * Used for infra / smoke testing only
 */
router.get("/db", async (_req, res) => {
  try {
    await db.execute("select 1");
    res.json({ status: "ok" });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      message: err?.message ?? "db failure",
    });
  }
});

export default router;
