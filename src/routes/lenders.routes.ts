import { Router, type Request } from "express";
import { requireAuth, requireCapability } from "../middleware/auth";
import { CAPABILITIES } from "../auth/capabilities";
import { safeHandler } from "../middleware/safeHandler";
import { AppError } from "../middleware/errors";
import {
  listLenders,
  createLender,
  getLenderWithProducts,
} from "../controllers/lenders.controller";

const router = Router();

router.use((req, res, next) => {
  res.locals.requestId = (req as Request & { id?: string }).id ?? res.locals.requestId;
  next();
});

if (process.env.NODE_ENV === "test") {
  router.get(
    "/__test-error",
    safeHandler(() => {
      throw new AppError("internal_error", 500);
    })
  );
}

/**
 * GET /api/lenders
 * - Auth required
 * - Staff, Admin, Ops allowed via LENDERS_READ
 */
router.get(
  "/",
  requireAuth,
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
  requireAuth,
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
  requireAuth,
  requireCapability([CAPABILITIES.OPS_MANAGE]),
  safeHandler(createLender)
);

export default router;
