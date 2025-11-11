import { Router } from "express";
import { z } from "zod";

import { retryQueueService } from "../../../services/retryQueueService.js";

const router = Router();

const retrySchema = z.object({
  id: z.string().min(1)
});

router.get("/", (_req, res) => {
  const queue = retryQueueService.listQueue();
  res.json({ message: "OK", queue });
});

router.post("/retry", (req, res, next) => {
  try {
    const payload = retrySchema.parse(req.body);
    const item = retryQueueService.retryItem(payload.id);
    if (!item) {
      throw new Error(`Retry item ${payload.id} not found`);
    }
    res.json({ message: "OK", item });
  } catch (error) {
    next(error);
  }
});

export default router;
