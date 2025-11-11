import { Router } from "express";
import { z } from "zod";

const router = Router();

const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  dueDate: z.string().datetime().optional(),
  assignee: z.string().optional()
});

interface Task extends z.infer<typeof createTaskSchema> {
  id: string;
  createdAt: string;
}

const tasks = new Map<string, Task>();

router.get("/", (_req, res) => {
  res.json({ message: "OK", tasks: Array.from(tasks.values()) });
});

router.post("/", (req, res, next) => {
  try {
    const payload = createTaskSchema.parse(req.body);
    const task: Task = {
      id: `task-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...payload
    };
    tasks.set(task.id, task);
    res.status(201).json({ message: "OK", task });
  } catch (error) {
    next(error);
  }
});

export default router;
