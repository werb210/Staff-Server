import { Router } from "express";
import { z } from "zod";
import { retryQueueService } from "../../../services/retryQueueService.js";
import { logError, logInfo } from "../../../utils/logger.js";

const router = Router();

const RetrySchema = z.object({ id: z.string().uuid() });

// Returns the current retry queue snapshot.
router.get("/", (_req, res) => {
  logInfo("Listing retry queue");
  res.json({ message: "OK", data: retryQueueService.listJobs() });
});

// Marks a job for retry.
router.post("/retry", (req, res) => {
  try {
    const payload = RetrySchema.parse(req.body);
    logInfo("Retrying job", payload);
    const job = retryQueueService.retryJob(payload.id);
    res.json({ message: "OK", data: job });
  } catch (error) {
    logError("Failed to retry job", error);
    res.status(400).json({ message: "Unable to retry job" });
  }
});

export default router;
