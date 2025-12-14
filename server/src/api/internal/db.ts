import { Router } from "express";
import { db, connectDb } from "../../db";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    await connectDb();
    const result = await db.query("SELECT 1");
    res.json({ ok: true, result: result.rows });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
