import { Router } from "express";
import { z } from "zod";
import { isPlaceholderSilo, respondWithPlaceholder } from "../../utils/placeholder.js";

const router = Router();

router.get("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const jobs = req.silo!.services.retryQueue.listJobs();
  res.json({ message: "OK", data: jobs });
});

router.post("/enqueue", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const payload = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Invalid job payload" });
  }
  const job = req.silo!.services.retryQueue.enqueueJob(payload.data.name);
  res.status(201).json({ message: "OK", data: job });
});

router.post("/:id/retry", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ message: "Invalid job id" });
  }
  const job = req.silo!.services.retryQueue.retryJob(id.data);
  res.json({ message: "OK", data: job });
});

export default router;
