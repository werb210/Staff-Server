import { Router } from "express";
import { pool } from "../../db/pool.js";

const router = Router();

/* HEALTH */
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/* DB CHECK */
router.get("/db", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.json({ db: "ok" });
  } catch (err) {
    res.status(500).json({ db: "error" });
  }
});

/* ROUTES */
router.get("/routes", (_req, res) => {
  res.json([
    "POST /api/auth/login",
    "POST /api/auth/register",
    "POST /api/auth/verify-sms",
    "POST /api/auth/refresh-token",
    "GET  /api/users",
    "GET  /api/users/:id",
    "GET  /api/_int/health",
    "GET  /api/_int/db",
    "GET  /api/_int/routes"
  ]);
});

export default router;
