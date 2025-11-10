import { Router } from "express";
import { logInfo } from "../utils/logger.js";
import { isProduction } from "../utils/env.js";

const tasksRouter = Router();

tasksRouter.get("/", (_req, res) => {
  logInfo("GET /api/tasks invoked");
  res.json({ message: "List tasks not implemented", production: isProduction() });
});

tasksRouter.post("/", (req, res) => {
  logInfo("POST /api/tasks invoked");
  res.status(201).json({ message: "Task created", payload: req.body ?? {} });
});

export default tasksRouter;
