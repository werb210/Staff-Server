import { Router } from "express";
import requireAuth from "../middleware/requireAuth";
import { requireCapabilities } from "../middleware/requireCapabilities";
import { CAPABILITIES } from "../auth/capabilities";
import {
  listLendersHandler,
  createLenderHandler,
} from "../controllers/lenders.controller";

const router = Router();

/**
 * READ – Staff Portal Lenders page
 * OPS_MANAGE users must be allowed implicitly
 */
router.get(
  "/",
  requireAuth,
  requireCapabilities(CAPABILITIES.LENDERS_READ),
  listLendersHandler
);

/**
 * WRITE – Admin / Ops only
 */
router.post(
  "/",
  requireAuth,
  requireCapabilities(CAPABILITIES.OPS_MANAGE),
  createLenderHandler
);

export default router;
