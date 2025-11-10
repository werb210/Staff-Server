import { Router } from "express";
import { z } from "zod";
import { lenderService } from "../../services/lenderService.js";
import { isValidUuid } from "../../utils/uuidValidator.js";

const querySchema = z.object({
  lenderId: z
    .string()
    .optional()
    .refine((value: string | undefined) => (value ? isValidUuid(value) : true), {
      message: "lenderId must be a UUID when provided"
    })
});

const router = Router();

/**
 * GET /api/document-requirements
 * Returns lender-specific document requirements.
 */
router.get("/", async (req, res) => {
  try {
    const { lenderId } = querySchema.parse(req.query);
    const requirements = await lenderService.getDocumentRequirements(lenderId ?? "generic-lender");
    res.json({ requirements });
  } catch (error) {
    res.status(400).json({
      message: "Failed to fetch document requirements",
      error: (error as Error).message
    });
  }
});

export default router;
