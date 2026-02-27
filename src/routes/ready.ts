import type { Request, Response } from "express";
import { Router } from "express";
import { getStatus, isReady } from "../startupState";

const router = Router();

export function healthHandler(_req: Request, res: Response): void {
  res.status(200).json({ status: "ok" });
}

export function readyHandler(_req: Request, res: Response): void {
  if (!isReady()) {
    const status = getStatus();
    res.status(503).json({
      code: "service_not_ready",
      reason: status.reason,
    });
    return;
  }
  res.status(200).json({ status: "ok" });
}

router.get("/health", healthHandler);
router.get("/ready", readyHandler);

export default router;
