import { Router } from "express";
import requireAuth, { requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { safeHandler } from "../middleware/safeHandler";
import {
  createLenderHandler,
  listLendersHandler,
} from "../controllers/lenders.controller";

const router = Router();

router.use(requireAuth);

router.get("/", requireCapability([CAPABILITIES.LENDERS_READ]), safeHandler(listLendersHandler));
router.post(
  "/",
  requireCapability([CAPABILITIES.OPS_MANAGE]),
  safeHandler(createLenderHandler)
);

export default router;
