import { Router } from "express";
import { query } from "../../db";

const router = Router();

router.get("/", async (_req, res) => {
  const result = await query("select 1 as ok");
  res.json({ ok: true, result: result.rows });
});

export default router;
