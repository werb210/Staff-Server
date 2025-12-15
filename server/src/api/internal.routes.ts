import { Router } from "express";
import { listRegisteredRoutes } from "../routes/listRoutes";

const router = Router();

/**
 * GET /api/internal/health
 */
router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: "staff-server",
    scope: "internal",
  });
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
