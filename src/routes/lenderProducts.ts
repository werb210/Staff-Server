import { Router } from "express";
import requireAuth, { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { safeHandler } from "../middleware/safeHandler";
import {
  createLenderProductHandler,
  listLenderProductsHandler,
} from "../controllers/lenderProducts.controller";

const router = Router();

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.LENDERS_READ]));

router.get("/", safeHandler(listLenderProductsHandler));
router.post("/", safeHandler(createLenderProductHandler));

export default router;
