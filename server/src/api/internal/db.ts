import { Router } from "express";
import { pool } from "../../db";

const router = Router();

router.get("/ping", async (_req, res) => {
  const result = await pool.query("select 1 as ok");
  res.json(result.rows[0]);
});

export default router;
