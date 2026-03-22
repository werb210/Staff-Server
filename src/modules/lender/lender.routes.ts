import { Router } from "express";
import { safeHandler } from "../../middleware/safeHandler";
import { requireAuth } from "../../middleware/requireAuth";
import { requireIdempotency } from "../../middleware/requireIdempotency";

const router = Router();

// Example endpoints

router.post(
  "/send",
  requireAuth,
  requireIdempotency,
  safeHandler(async (req, res) => {
    res.json({ success: true });
  })
);

router.get(
  "/products",
  requireAuth,
  safeHandler(async (req, res) => {
    res.json({ products: [] });
  })
);

export default router;
