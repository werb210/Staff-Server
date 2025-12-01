import { Router } from "express";
import { db } from "../db/db.js";

const r = Router();

r.get("/", async (req, res) => {
  try {
    await db.execute("SELECT 1");
    res.json({ ok: true, db: "healthy" });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default r;
