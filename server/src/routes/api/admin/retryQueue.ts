import { Router } from "express";
import { z } from "zod";
import { retryQueueService } from "../../../services/retryQueueService.js";
import { isValidUuid } from "../../../utils/uuidValidator.js";

const enqueueSchema = z.object({
  id: z.string().refine((value: string) => isValidUuid(value), { message: "id must be a UUID" }),
  type: z.string().min(1, "type is required"),
  payload: z.record(z.unknown()),
  attempts: z.number().int().nonnegative(),
  lastError: z.string().optional()
});

const router = Router();

/**
 * GET /api/admin/retry-queue
 * Lists jobs currently pending in the retry queue.
 */
router.get("/", async (_req, res) => {
  const jobs = await retryQueueService.list();
  res.json({ jobs });
});

/**
 * POST /api/admin/retry-queue
 * Adds a job to the retry queue (useful for testing).
 */
router.post("/", async (req, res) => {
  try {
    const job = enqueueSchema.parse(req.body);
    await retryQueueService.enqueue(job);
    res.status(201).json({ job });
  } catch (error) {
    res.status(400).json({
      message: "Failed to enqueue retry job",
      error: (error as Error).message
    });
  }
});

/**
 * DELETE /api/admin/retry-queue/:id
 * Removes a job from the retry queue.
 */
router.delete("/:id", async (req, res) => {
  const success = await retryQueueService.remove(req.params.id);
  if (!success) {
    res.status(404).json({ message: "Job not found" });
    return;
  }
  res.status(204).send();
});

export default router;
