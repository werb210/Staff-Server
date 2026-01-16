import { Router, type Request, type Response } from "express";
import { getStatus, isReady } from "../startupState";

type PortalApplication = {
  id: string;
  status?: string;
};

const router = Router();

function ensureReady(res: Response): boolean {
  if (!isReady()) {
    const status = getStatus();
    res.status(503).json({
      ok: false,
      code: "service_not_ready",
      reason: status.reason,
    });
    return false;
  }
  return true;
}

router.get("/applications", (_req, res) => {
  if (!ensureReady(res)) {
    return;
  }
  res.status(200).json({
    items: [],
    total: 0,
  });
});

router.get("/applications/:id", (req: Request, res: Response) => {
  if (!ensureReady(res)) {
    return;
  }
  const record: PortalApplication | null = null;
  if (!record) {
    res.status(404).json({
      code: "not_found",
      message: "Application not found.",
      requestId: res.locals.requestId ?? "unknown",
    });
    return;
  }
  res.status(200).json(record);
});

export default router;
