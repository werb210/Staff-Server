import { Router } from "express";
import { z } from "zod";
import { lenderService } from "../../../services/lenderService.js";
import { isValidUuid } from "../../../utils/uuidValidator.js";

const reportQuerySchema = z.object({
  lenderId: z
    .string()
    .optional()
    .refine((value: string | undefined) => (value ? isValidUuid(value) : true), {
      message: "lenderId must be a UUID when provided"
    }),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

const router = Router();

/**
 * GET /api/lenders/reports
 * Returns aggregate metrics for lender performance.
 */
router.get("/", async (req, res) => {
  try {
    const filters = reportQuerySchema.parse(req.query);
    const report = await lenderService.generateLenderReport(filters);
    res.json({ report });
  } catch (error) {
    res.status(400).json({
      message: "Failed to generate lender report",
      error: (error as Error).message
    });
  }
});

export default router;
