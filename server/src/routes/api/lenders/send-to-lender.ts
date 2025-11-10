import { Router } from "express";
import { z } from "zod";
import { lenderService } from "../../../services/lenderService.js";
import { isValidUuid } from "../../../utils/uuidValidator.js";

const sendToLenderSchema = z.object({
  applicationId: z
    .string()
    .refine((value: string) => isValidUuid(value), { message: "applicationId must be a UUID" }),
  lenderId: z
    .string()
    .refine((value: string) => isValidUuid(value), { message: "lenderId must be a UUID" }),
  notes: z.string().optional()
});

const router = Router();

/**
 * POST /api/lenders/send-to-lender
 * Sends an application to a lender integration.
 */
router.post("/", async (req, res) => {
  try {
    const payload = sendToLenderSchema.parse(req.body);
    const result = await lenderService.sendApplicationToLender(payload);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      message: "Failed to send application to lender",
      error: (error as Error).message
    });
  }
});

export default router;
