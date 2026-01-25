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
import {
  createLenderProductRequirementHandler as createRequirementHandler,
  updateLenderProductRequirementHandler as updateRequirementHandler,
  deleteLenderProductRequirementHandler as deleteRequirementHandler,
  listLenderProductRequirementsHandler as listRequirementsHandler,
} from "../controllers/lenderProductRequirements.controller";

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

/**
 * GET /api/lender-products/:id/requirements
 * - Auth required
 * - Staff / Admin / Ops / Lender via LENDER_PRODUCTS_READ
 */
router.get(
  "/:id/requirements",
  requireAuth,
  requireCapability([CAPABILITIES.LENDER_PRODUCTS_READ]),
  safeHandler(listRequirementsHandler)
);

/**
 * POST /api/lender-products/:id/requirements
 * - Auth required
 * - Admin only
 */
router.post(
  "/:id/requirements",
  requireAuth,
  safeHandler(createRequirementHandler)
);

/**
 * PUT /api/lender-products/:id/requirements/:reqId
 * - Auth required
 * - Admin only
 */
router.put(
  "/:id/requirements/:reqId",
  requireAuth,
  safeHandler(updateRequirementHandler)
);

/**
 * DELETE /api/lender-products/:id/requirements/:reqId
 * - Auth required
 * - Admin only
 */
router.delete(
  "/:id/requirements/:reqId",
  requireAuth,
  safeHandler(deleteRequirementHandler)
);

export default router;
