import { Router } from "express";
import {
  listLendersHandler,
  createLenderHandler,
} from "../controllers/lenders.controller";
import { requireAuth } from "../middleware/requireAuth";
import { requireCapabilities } from "../middleware/requireCapabilities";
import { CAPABILITIES } from "../auth/capabilities";

const router = Router();

/**
 * READ
 * Required by Staff Portal to render Lenders page
 */
router.get(
  "/",
  requireAuth,
  requireCapabilities(CAPABILITIES.LENDERS_READ),
  listLendersHandler
);

/**
 * WRITE
 * Restricted to ops/admin only
 */
router.post(
  "/",
  requireAuth,
  requireCapabilities(CAPABILITIES.OPS_MANAGE),
  createLenderHandler
);

export default router;
