import { Router } from "express";
import { z } from "zod";
import { isPlaceholderSilo, respondWithPlaceholder } from "../utils/placeholder.js";

const router = Router();

router.get("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const tasks = req.silo!.services.tasks.listTasks();
  res.json({ message: "OK", data: tasks });
});

router.post("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const payload = z
    .object({
      name: z.string().min(1),
      description: z.string().optional(),
      dueAt: z.string().datetime({ offset: true }),
      assignedTo: z.string().optional(),
    })
    .safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Invalid task payload" });
  }
  const task = req.silo!.services.tasks.createTask(payload.data);
  res.status(201).json({ message: "OK", data: task });
});

router.post("/:id/status", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const payload = z
    .object({
      status: z.enum(["pending", "in-progress", "completed"]),
    })
    .safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Invalid status" });
  }
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ message: "Invalid task id" });
  }
  const task = req.silo!.services.tasks.updateStatus(id.data, payload.data.status);
  res.json({ message: "OK", data: task });
});

export default router;
