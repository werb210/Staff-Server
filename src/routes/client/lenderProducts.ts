import { Router } from "express";
import { pool } from "../../db";
import {
  listClientLenderProductRequirementsHandler,
} from "../../controllers/lenderProductRequirements.controller";
import { listRequirementsForFilters } from "../../services/lenderProductRequirementsService";
import { AppError } from "../../middleware/errors";

const router = Router();

/**
 * GET /api/client/lender-products
 * Public, ACTIVE lenders + ACTIVE products only
 */
router.get("/", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        lp.id,
        lp.name,
        lp.category,
        lp.term_min,
        lp.term_max,
        lp.country
      FROM lender_products lp
      LEFT JOIN lenders l ON l.id = lp.lender_id
      WHERE lp.active = true
        AND l.active = true
      ORDER BY lp.name
      `
    );

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/client/lender-products/requirements
 * Query:
 * - category (required)
 * - country (optional)
 * - requestedAmount (optional)
 */
router.get("/requirements", async (req, res, next) => {
  try {
    const category =
      typeof req.query.category === "string" ? req.query.category.trim() : "";
    if (!category) {
      throw new AppError("validation_error", "category is required.", 400);
    }
    const country =
      typeof req.query.country === "string" ? req.query.country.trim() : null;
    const requestedAmountRaw = req.query.requestedAmount;
    let requestedAmount: number | null = null;
    if (requestedAmountRaw !== undefined) {
      const parsed = Number(requestedAmountRaw);
      if (Number.isNaN(parsed)) {
        throw new AppError("validation_error", "requestedAmount must be a number.", 400);
      }
      requestedAmount = parsed;
    }

    const requirements = await listRequirementsForFilters({
      category,
      country,
      requestedAmount,
    });

    res.status(200).json({
      requirements: requirements.map((requirement) => ({
        documentType: requirement.documentType,
        required: requirement.required,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/client/lender-products/:id/requirements
 * Public, ACTIVE products only
 */
router.get("/:id/requirements", async (req, res, next) => {
  try {
    await listClientLenderProductRequirementsHandler(req, res);
  } catch (err) {
    next(err);
  }
});

export default router;
