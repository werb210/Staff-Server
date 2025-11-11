import { Router } from "express";
import { z } from "zod";
import { twilioService } from "../../../services/twilioService.js";
import { logError, logInfo } from "../../../utils/logger.js";

const router = Router();

const CallSchema = z.object({
  to: z.string().min(5),
  from: z.string().min(5),
  durationSeconds: z.number().int().nonnegative(),
  outcome: z.enum(["completed", "no-answer", "busy"]),
  notes: z.string().min(1).optional(),
});

// Records an outbound call using the Twilio service stub.
router.post("/", (req, res) => {
  try {
    const payload = CallSchema.parse(req.body);
    logInfo("Logging call", { to: payload.to });
    const call = twilioService.logCall(
      payload.to,
      payload.from,
      payload.durationSeconds,
      payload.outcome,
      payload.notes,
    );
    res.status(201).json({ message: "OK", data: call });
  } catch (error) {
    logError("Failed to log call", error);
    res.status(400).json({ message: "Unable to log call" });
  }
});

// Lists previously logged calls.
router.get("/", (_req, res) => {
  logInfo("Listing call log");
  res.json({ message: "OK", data: twilioService.listCalls() });
});

export default router;
