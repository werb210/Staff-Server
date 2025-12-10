import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { TasksService } from "./tasks.service";
import { createTaskSchema, updateTaskSchema } from "./tasks.validators";

const router = Router();
const tasksService = new TasksService();

router.use(requireAuth);

router.post("/", async (req, res, next) => {
  try {
    const payload = createTaskSchema.parse(req.body);
    const record = await tasksService.createTask({
      ...payload,
      assignedByUserId: req.user!.id,
    });
    res.json({ ok: true, task: record });
  } catch (err) {
    next(err);
  }
});

router.get("/my", async (req, res, next) => {
  try {
    const tasks = await tasksService.listMyTasks(req.user!.id);
    res.json({ ok: true, tasks });
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const payload = updateTaskSchema.parse(req.body);
    let updated = null;
    if (payload.status === "completed") {
      updated = await tasksService.completeTask(req.params.id);
    } else {
      updated = await tasksService.updateTask(req.params.id, {
        ...payload,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      });
    }
    res.json({ ok: true, task: updated });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    await tasksService.deleteTask(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
