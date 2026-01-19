import { Router } from "express";
import requireAuth from "../middleware/requireAuth";
import { requireCapabilities } from "../middleware/requireCapabilities";
import { CAPABILITIES } from "../auth/capabilities";
import {
  listLendersHandler,
  createLenderHandler,
} from "../controllers/lenders.controller";

const router = Router();

// Preflight must never require auth
router.options("/", (_req, res) => res.sendStatus(204));

router.get(
  "/",
  requireAuth,
  requireCapabilities(CAPABILITIES.LENDERS_READ),
  listLendersHandler
);

router.post(
  "/",
  requireAuth,
  requireCapabilities(CAPABILITIES.LENDERS_WRITE),
  createLenderHandler
);

export default router;
