import { Router } from "express";
import { db } from "../../db";

export const dbRouter = Router();

dbRouter.get("/", async (_req, res) => {
  try {
    await db.execute("select 1");
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "db_failed" });
  }
});
