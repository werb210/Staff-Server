import { Router } from "express";
import requireAuth from "../middleware/requireAuth";
import { requireCapabilities } from "../middleware/requireCapabilities";
import { CAPABILITIES } from "../auth/capabilities";
import { safeHandler } from "../middleware/safeHandler";
import {
  createLenderHandler,
  listLendersHandler,
} from "../controllers/lenders.controller";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  requireCapabilities(CAPABILITIES.LENDERS_READ),
  safeHandler(listLendersHandler)
);
router.post(
  "/",
  requireCapabilities(CAPABILITIES.OPS_MANAGE),
  safeHandler(createLenderHandler)
);

export default router;
