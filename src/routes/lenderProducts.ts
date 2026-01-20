import { Router } from "express";
import { requireAuth, requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { safeHandler } from "../middleware/safeHandler";
import {
  createLenderProductHandler,
  listLenderProductsHandler,
  updateLenderProductHandler,
} from "../controllers/lenderProducts.controller";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  requireCapability([CAPABILITIES.LENDERS_READ]),
  safeHandler(listLenderProductsHandler)
);
router.post(
  "/",
  requireCapability([CAPABILITIES.OPS_MANAGE]),
  safeHandler(createLenderProductHandler)
);
router.patch(
  "/:id",
  requireCapability([CAPABILITIES.LENDERS_READ]),
  safeHandler(updateLenderProductHandler)
);

export default router;
