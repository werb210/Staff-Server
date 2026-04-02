import { Router } from "express";
import { isReady } from "../system/ready";
import type { Request, Response } from "express";
import { fail, ok } from "../utils/http/respond";

const router = Router();

export function health(_req: Request, res: Response) {
  return ok(res, { status: "ok" });
}

export function ready(_req: Request, res: Response) {
  if (!isReady()) {
    return fail(res, "Service not ready", 503, "NOT_READY");
  }

  return ok(res, { status: "ready" });
}

router.get("/health", health);
router.get("/healthz", health);
router.get("/ready", ready);
router.get("/readyz", ready);

export default router;
