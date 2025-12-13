import { Router } from "express";
import { db } from "../../db";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    // This MUST hit the DB or it is useless
    await db.execute("SELECT 1");
    res.status(200).json({
      status: "ok",
      db: "connected"
    });
  } catch (err) {
    console.error("DB health check failed:", err);
    res.status(500).json({
      status: "error",
      db: "unreachable"
    });
  }
});

export default router;
