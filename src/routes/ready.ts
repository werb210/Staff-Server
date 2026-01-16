import type { Request, Response } from "express";
import { Router } from "express";
import { getBuildInfo } from "../config";
import { getStatus, isReady } from "../startupState";

const router = Router();

export function healthHandler(_req: Request, res: Response): void {
  const { commitHash } = getBuildInfo();
  res.status(200).json({
    ok: true,
    uptime: process.uptime(),
    version: commitHash,
  });
}

export function readyHandler(_req: Request, res: Response): void {
  if (!isReady()) {
    const status = getStatus();
    res.status(503).json({
      ok: false,
      code: "service_not_ready",
      reason: status.reason,
    });
    return;
  }
  res.status(200).json({ ok: true });
}

router.get("/health", healthHandler);
router.get("/ready", readyHandler);

export default router;
