import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { TasksService } from "./tasks.service";
import { createTaskSchema, updateTaskSchema } from "./tasks.validators";
import { BadRequest } from "../errors";

const router = Router();
const tasksService = new TasksService();

router.use(requireAuth);

router.post("/", async (req, res, next) => {
  try {
    const payload = createTaskSchema.parse({
      title: req.body?.title,
      description: req.body?.description ?? "",
      applicationId: req.body?.applicationId ?? undefined,
      assignedToUserId: req.body?.assignedToUserId ?? undefined,
      dueDate: req.body?.dueDate ?? undefined,
    });

    if (!payload.title) {
      throw new BadRequest("title required");
    }

    const taskPayload: Parameters<(typeof tasksService)["createTask"]>[0] = {
      assignedByUserId: req.user!.id,
      title: payload.title,
      applicationId: payload.applicationId,
      description: payload.description ?? "",
      assignedToUserId: payload.assignedToUserId,
      dueDate: payload.dueDate,
    };

    const record = await tasksService.createTask(taskPayload);
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
    const parsed = updateTaskSchema.parse(req.body);
    let updated = null;
    if (parsed.status === "completed") {
      updated = await tasksService.completeTask(req.params.id);
    } else {
      const updatePayload = {
        ...parsed,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
      };
      updated = await tasksService.updateTask(req.params.id, updatePayload);
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
