import { Router } from "express";
import { connectDb } from "../../db";

const router = Router();

router.get("/", async (_req, res) => {
  const db = await connectDb();
  const result = await db.query("select 1 as ok");
  res.json(result.rows[0]);
});

export default router;
