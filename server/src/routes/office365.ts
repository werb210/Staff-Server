import { Router } from "express";
import { Office365EmailSchema, Office365EventSchema, Office365TaskSchema } from "../schemas/office365Schemas.js";
import { office365Service } from "../services/office365Service.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";

const router = Router();

router.get("/calendar", (_req, res, next) => {
  try {
    logInfo("GET /api/office365/calendar");
    const events = office365Service.listCalendar();
    res.json({ message: "OK", data: events });
  } catch (error) {
    next(error);
  }
});

router.post("/calendar", (req, res, next) => {
  try {
    logInfo("POST /api/office365/calendar", req.body);
    const payload = parseWithSchema(Office365EventSchema, req.body);
    const event = office365Service.createEvent(payload);
    res.status(201).json({ message: "OK", data: event });
  } catch (error) {
    next(error);
  }
});

router.post("/email", (req, res, next) => {
  try {
    logInfo("POST /api/office365/email", req.body);
    const payload = parseWithSchema(Office365EmailSchema, req.body);
    const result = office365Service.sendEmail(payload);
    res.json({ message: "OK", data: result });
  } catch (error) {
    next(error);
  }
});

router.get("/tasks", (_req, res, next) => {
  try {
    logInfo("GET /api/office365/tasks");
    const tasks = office365Service.listTasks();
    res.json({ message: "OK", data: tasks });
  } catch (error) {
    next(error);
  }
});

router.post("/tasks", (req, res, next) => {
  try {
    logInfo("POST /api/office365/tasks", req.body);
    const payload = parseWithSchema(Office365TaskSchema, req.body);
    const task = office365Service.createTask(payload);
    res.status(201).json({ message: "OK", data: task });
  } catch (error) {
    next(error);
  }
});

router.put("/tasks/:id", (req, res) => {
  logInfo("PUT /api/office365/tasks/:id", { id: req.params.id });
  res.json({ message: "OK", notice: "Task updates not implemented" });
});

router.delete("/tasks/:id", (req, res) => {
  logInfo("DELETE /api/office365/tasks/:id", { id: req.params.id });
  res.json({ message: "OK", notice: "Task deletion stub" });
});

export default router;
