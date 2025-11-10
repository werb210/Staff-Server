import { Router } from "express";
import { z } from "zod";
import { lenderService } from "../../../services/lenderService.js";
import { isValidUuid } from "../../../utils/uuidValidator.js";

const payloadSchema = z.object({
  applicationId: z.string().refine((value) => isValidUuid(value), {
    message: "applicationId must be a UUID"
  }),
  lenderId: z.string().refine((value) => isValidUuid(value), {
    message: "lenderId must be a UUID"
  })
});

const router = Router();

/**
 * POST /api/lenders/send-to-lender
 * Returns a stubbed confirmation from the lender service.
 */
router.post("/", (req, res) => {
  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid payload",
      issues: parsed.error.flatten().fieldErrors
    });
    return;
  }

  const result = lenderService.sendToLender(parsed.data.applicationId, parsed.data.lenderId);
  res.json(result);
});

export default router;
