import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireCapabilities } from "../middleware/requireCapabilities";
import { CAPABILITIES } from "../auth/capabilities";
import {
  listLenders,
  createLender
} from "../controllers/lenders.controller";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireCapabilities(CAPABILITIES.LENDERS_READ),
  listLenders
);

router.post(
  "/",
  requireAuth,
  requireCapabilities(CAPABILITIES.OPS_MANAGE),
  createLender
);

export default router;
