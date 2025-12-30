import { Router } from "express";

const router = Router();

/**
 * GET /api/system/ping
 */
router.get("/ping", (_req, res) => {
  res.send("pong");
});

/**
 * GET /api/system/version
 */
router.get("/version", (_req, res) => {
  res.json({
    name: "boreal-staff-server",
    version: "1.0.0",
    env: process.env.NODE_ENV ?? "unknown",
  });
});

export default router;
