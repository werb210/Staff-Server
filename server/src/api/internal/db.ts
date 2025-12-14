import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../../db";

const router = Router();

router.get("/db", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      message: err?.message ?? "db failure",
    });
  }
});

export default router;
