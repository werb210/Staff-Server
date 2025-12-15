import { Router } from "express";

import { verifyDatabaseConnection } from "../db";
import { listRegisteredRoutes } from "../routes/listRoutes";

const router = Router();

/**
 * GET /api/internal/health
 */
router.get("/health", async (_req, res) => {
  try {
    const dbConnected = await verifyDatabaseConnection();
    const status = dbConnected ? "ok" : "degraded";
    const httpStatus = dbConnected ? 200 : 503;

    res.status(httpStatus).json({
      status,
      dbConnected,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: "staff-server",
      scope: "internal",
    });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      dbConnected: false,
      message: err?.message ?? "Health check failed",
      timestamp: new Date().toISOString(),
      service: "staff-server",
      scope: "internal",
    });
  }
});

/**
 * GET /api/internal/routes
 * Returns a best-effort list of registered routes.
 */
router.get("/routes", (req, res) => {
  try {
    const routes = listRegisteredRoutes(req.app, "");
    res.status(200).json({ status: "ok", routes });
  } catch (err: any) {
    res.status(500).json({
      status: "error",
      message: err?.message || "Failed to enumerate routes",
    });
  }
});

export default router;
