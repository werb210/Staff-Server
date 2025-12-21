"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const tasks_service_1 = require("./tasks.service");
const tasks_validators_1 = require("./tasks.validators");
const errors_1 = require("../errors");
const router = (0, express_1.Router)();
const tasksService = new tasks_service_1.TasksService();
router.use(requireAuth_1.requireAuth);
router.post("/", async (req, res, next) => {
    try {
        const payload = tasks_validators_1.createTaskSchema.parse({
            title: req.body?.title,
            description: req.body?.description ?? "",
            applicationId: req.body?.applicationId ?? undefined,
            assignedToUserId: req.body?.assignedToUserId ?? undefined,
            dueDate: req.body?.dueDate ?? undefined,
        });
        if (!payload.title) {
            throw new errors_1.BadRequest("title required");
        }
        const record = await tasksService.createTask({
            title: payload.title,
            description: payload.description,
            applicationId: payload.applicationId,
            assignedToUserId: payload.assignedToUserId,
            dueDate: payload.dueDate,
            assignedByUserId: req.user.id,
        });
        res.json({ ok: true, task: record });
    }
    catch (err) {
        next(err);
    }
});
router.get("/my", async (req, res, next) => {
    try {
        const tasks = await tasksService.listMyTasks(req.user.id);
        res.json({ ok: true, tasks });
    }
    catch (err) {
        next(err);
    }
});
router.patch("/:id", async (req, res, next) => {
    try {
        const parsed = tasks_validators_1.updateTaskSchema.parse(req.body);
        let updated = null;
        if (parsed.status === "completed") {
            updated = await tasksService.completeTask(req.params.id);
        }
        else {
            const updatePayload = {
                ...parsed,
                dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
            };
            updated = await tasksService.updateTask(req.params.id, updatePayload);
        }
        res.json({ ok: true, task: updated });
    }
    catch (err) {
        next(err);
    }
});
router.delete("/:id", async (req, res, next) => {
    try {
        await tasksService.deleteTask(req.params.id);
        res.json({ ok: true });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
