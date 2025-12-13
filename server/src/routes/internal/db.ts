import { Router } from "express";

// use require so TS does not try to type-resolve db
const { db } = require("../../db");

const router = Router();

router.get("/", async (_req, res) => {
  try {
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
