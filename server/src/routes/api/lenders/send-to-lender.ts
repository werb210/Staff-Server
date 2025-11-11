import { Router } from "express";
import { z } from "zod";
import { lenderService } from "../../../services/lenderService.js";
import { logError, logInfo } from "../../../utils/logger.js";

const router = Router();

const SendSchema = z.object({
  applicationId: z.string().uuid(),
  lenderId: z.string().uuid(),
});

// Simulates sending an application package to a lender.
router.post("/", (req, res) => {
  try {
    const payload = SendSchema.parse(req.body);
    logInfo("Sending application to lender", payload);
    const result = lenderService.sendToLender(
      payload.applicationId,
      payload.lenderId,
    );
    res.json({ message: "OK", data: result });
  } catch (error) {
    logError("Failed to send to lender", error);
    res.status(400).json({ message: "Unable to send to lender" });
  }
});

export default router;
