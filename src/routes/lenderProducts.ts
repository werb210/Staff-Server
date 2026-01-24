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
 * - Staff / Admin / Ops / Lender via LENDER_PRODUCTS_READ
 */
router.get(
  "/",
  requireAuth,
  requireCapability([CAPABILITIES.LENDER_PRODUCTS_READ]),
  safeHandler(listLenderProductsHandler)
);

/**
 * POST /api/lender-products
 * - Auth required
 * - Staff / Admin / Ops / Lender via LENDER_PRODUCTS_WRITE
 */
router.post(
  "/",
  requireAuth,
  requireCapability([CAPABILITIES.LENDER_PRODUCTS_WRITE]),
  safeHandler(createLenderProductHandler)
);

/**
 * PATCH /api/lender-products/:id
 * - Auth required
 * - Staff / Admin / Ops / Lender via LENDER_PRODUCTS_WRITE
 */
router.patch(
  "/:id",
  requireAuth,
  requireCapability([CAPABILITIES.LENDER_PRODUCTS_WRITE]),
  safeHandler(updateLenderProductHandler)
);

export default router;
