import { Router } from "express";
import { db } from "../../db";

const router = Router();

router.get("/db", async (_req, res) => {
  try {
    await db.execute("select 1");
    res.json({ db: "ok" });
  } catch (err: any) {
    res.status(500).json({
      db: "error",
      message: err?.message ?? "db failure"
    });
  }
});

export default router;
