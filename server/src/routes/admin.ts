import { Router } from "express";
import { BackupRequestSchema, RetryQueueActionSchema } from "../schemas/adminSchemas.js";
import { adminService } from "../services/adminService.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";

const router = Router();

router.get("/retry-queue", (_req, res, next) => {
  try {
    logInfo("GET /api/admin/retry-queue");
    const queue = adminService.listRetryQueue();
    res.json({ message: "OK", data: queue });
  } catch (error) {
    next(error);
  }
});

router.post("/retry-queue", (req, res, next) => {
  try {
    logInfo("POST /api/admin/retry-queue", req.body);
    const payload = parseWithSchema(RetryQueueActionSchema, req.body);
    const result = adminService.retryJob(payload);
    res.json({ message: "OK", data: result });
  } catch (error) {
    next(error);
  }
});

router.put("/retry-queue/:id", (req, res, next) => {
  try {
    logInfo("PUT /api/admin/retry-queue/:id", { id: req.params.id });
    const result = adminService.retryJob({ id: req.params.id });
    res.json({ message: "OK", data: result });
  } catch (error) {
    next(error);
  }
});

router.delete("/retry-queue/:id", (req, res, next) => {
  try {
    logInfo("DELETE /api/admin/retry-queue/:id", { id: req.params.id });
    const removed = adminService.clearJob(req.params.id);
    res.json({ message: "OK", removed });
  } catch (error) {
    next(error);
  }
});

router.get("/backups", (_req, res, next) => {
  try {
    logInfo("GET /api/admin/backups");
    const backups = adminService.listBackups();
    res.json({ message: "OK", data: backups });
  } catch (error) {
    next(error);
  }
});

router.post("/backups", (req, res, next) => {
  try {
    logInfo("POST /api/admin/backups", req.body);
    const payload = parseWithSchema(BackupRequestSchema, req.body);
    const backup = adminService.requestBackup(payload);
    res.status(201).json({ message: "OK", data: backup });
  } catch (error) {
    next(error);
  }
});

export default router;
