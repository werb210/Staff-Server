import { Router } from "express";
import { retryQueueService } from "../../../services/retryQueueService.js";

const router = Router();

/**
 * GET /api/admin/retry-queue
 * Returns stubbed retry queue jobs.
 */
router.get("/", (_req, res) => {
  const jobs = retryQueueService.listJobs();
  res.json({ message: "Retry queue retrieved", jobs });
});

export default router;
