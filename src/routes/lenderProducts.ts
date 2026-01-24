import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { safeHandler } from "../middleware/safeHandler";
import {
  createLenderProductHandler,
  listLenderProductsHandler,
  updateLenderProductHandler,
} from "../controllers/lenderProducts.controller";

const router = Router();

/**
 * GET /api/lender-products
 * - Auth required
 * - Staff / Admin / Ops via LENDERS_READ
 */
router.get(
  "/",
  requireAuth,
  requireCapability([CAPABILITIES.LENDERS_READ]),
  safeHandler(listLenderProductsHandler)
);

/**
 * POST /api/lender-products
 * - Auth required
 * - OPS_MANAGE only
 */
router.post(
  "/",
  requireAuth,
  requireCapability([CAPABILITIES.OPS_MANAGE]),
  safeHandler(createLenderProductHandler)
);

/**
 * PATCH /api/lender-products/:id
 * - Auth required
 * - OPS_MANAGE only
 */
router.patch(
  "/:id",
  requireAuth,
  requireCapability([CAPABILITIES.OPS_MANAGE]),
  safeHandler(updateLenderProductHandler)
);

export default router;
