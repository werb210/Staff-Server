// server/src/api/internal.routes.ts

import { Router } from "express";

const router = Router();

/**
 * Internal health check
 *
 * This must ALWAYS return quickly and NEVER depend on:
 * - Database connections
 * - Azure Blob Storage
 * - External APIs
 *
 * Azure and any internal monitors can safely hit this endpoint.
 */
router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    service: "staff-server",
    scope: "internal",
  });
});

export default router;
