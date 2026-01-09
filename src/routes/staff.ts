import { Router, Request, Response } from "express";
import { requireAuth, requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.STAFF_OVERVIEW]));

router.get("/overview", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

export default router;
