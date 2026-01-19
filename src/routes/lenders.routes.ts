import { Router } from "express";
import {
  listLendersHandler,
  createLenderHandler,
} from "../controllers/lenders.controller";
import requireAuth from "../middleware/requireAuth";
import { requireCapabilities } from "../middleware/requireCapabilities";
import { CAPABILITIES } from "../auth/capabilities";

const router = Router();

/**
 * READ
 * Admin / Ops allowed
 */
router.get(
  "/",
  requireAuth,
  requireCapabilities(CAPABILITIES.LENDERS_READ),
  listLendersHandler
);

/**
 * WRITE
 * Ops only
 */
router.post(
  "/",
  requireAuth,
  requireCapabilities(CAPABILITIES.OPS_MANAGE),
  createLenderHandler
);

export default router;
