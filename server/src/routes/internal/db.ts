import { Router } from "express";
import { getDb } from "../../db";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const db = await getDb();
    const result = await db.query("select 1 as ok");
    res.json({ ok: true, result: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
