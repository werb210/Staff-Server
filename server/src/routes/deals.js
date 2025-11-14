// routes/deals.js
// -----------------------------------------------------
// Global Deals Routes (NOT silo-based)
// Mounted at: /api/deals
// -----------------------------------------------------

import { Router } from "express";
import {
  getDeals,
  createDeal,
  getDealById,
  updateDeal,
  deleteDeal,
} from "../controllers/dealsController.js";

const router = Router();

// -----------------------------------------------------
// Async wrapper (Express 5-safe)
// -----------------------------------------------------
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// -----------------------------------------------------
// Param validator
// -----------------------------------------------------
router.param("dealId", (req, res, next, value) => {
  if (!value || typeof value !== "string" || value.length < 6) {
    return res.status(400).json({
      ok: false,
      error: "Invalid deal ID",
      received: value,
    });
  }
  next();
});

// -----------------------------------------------------
// ROUTES
// -----------------------------------------------------

// GET all deals
router.get("/", wrap(getDeals));

// CREATE a new deal
router.post("/", wrap(createDeal));

// GET a single deal
router.get("/:dealId", wrap(getDealById));

// UPDATE a deal
router.put("/:dealId", wrap(updateDeal));

// DELETE a deal
router.delete("/:dealId", wrap(deleteDeal));

export default router;
