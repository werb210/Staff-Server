// server/src/api/internal.routes.ts

import { Router } from "express";

const router = Router();

/**
 * Unauthenticated health check used by:
 * - Azure Web App health probes
 * - Your own curl checks
 *
 * Available at:
 *   - /api/internal/health
 *   - /api/public/health  (see index.ts mounting below)
 */
router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
