import { Router } from "express";
const router = Router();

/**
 * GET /api/_int/health
 */
router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/**
 * GET /api/_int/live
 */
router.get("/live", (_req, res) => {
  res.json({ status: "ok" });
});

/**
 * GET /api/_int/db
 */
router.get("/db", async (_req, res) => {
  try {
    const { pool } = await import("../../db/pool.js");
    await pool.query("select 1");
    res.json({ db: "ok" });
  } catch (error) {
    console.error("Database connectivity check failed", error);
    res.status(500).json({ db: "error" });
  }
});

/**
 * GET /api/_int/routes
 * (Hard-coded list so you can see what SHOULD exist)
 */
router.get("/routes", (_req, res) => {
  res.json([
    "GET  /",
    "POST /api/auth/login",
    "POST /api/auth/register",
    "POST /api/auth/verify-sms",
    "POST /api/auth/refresh-token",
    "GET  /api/users",
    "GET  /api/users/:id",
    "GET  /api/_int/health",
    "GET  /api/_int/live",
    "GET  /api/_int/db",
    "GET  /api/_int/routes",
    "GET  /api/crm",
    "GET  /api/crm/health"
  ]);
});

export default router;
