import { Router } from "express";
import { db } from "../../db";

const router = Router();

router.get("/ping", async (_req, res) => {
  const client = await db();
  const result = await client.query("select 1 as ok");
  res.json(result.rows[0]);
});

export default router;
