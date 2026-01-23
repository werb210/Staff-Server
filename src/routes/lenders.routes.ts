import { Router } from "express";
import requireAuthWithInternalBypass from "../middleware/requireAuth";
import { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { safeHandler } from "../middleware/safeHandler";
import {
  listLenders,
  createLender,
  getLenderWithProducts,
} from "../controllers/lenders.controller";

const router = Router();

/**
 * GET /api/lenders
 * - Auth required
 * - Staff, Admin, Ops allowed via LENDERS_READ
 */
router.get(
  "/",
  requireAuthWithInternalBypass,
  requireCapability([CAPABILITIES.LENDERS_READ]),
  safeHandler(listLenders)
);

/**
 * GET /api/lenders/:id/products
 * - Auth required
 * - Staff, Admin, Ops allowed via LENDERS_READ
 */
router.get(
  "/:id/products",
  requireAuthWithInternalBypass,
  requireCapability([CAPABILITIES.LENDERS_READ]),
  safeHandler(getLenderWithProducts)
);

/**
 * POST /api/lenders
 * - Auth required
 * - OPS_MANAGE only
 */
router.post(
  "/",
  requireAuthWithInternalBypass,
  requireCapability([CAPABILITIES.OPS_MANAGE]),
  safeHandler(createLender)
);

export default router;
