import { Router } from "express";
import { db, isDbConfigured } from "../db/db.js";

const r = Router();

r.get("/", async (_req, res) => {
  if (!isDbConfigured) {
    return res.status(503).json({ ok: false, error: "Database not configured" });
  }

  try {
    await db.execute("SELECT 1");
    res.json({ ok: true, db: "healthy" });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default r;
