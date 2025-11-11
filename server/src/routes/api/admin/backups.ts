import { Router } from "express";
import { z } from "zod";

import { backupService } from "../../../services/backupService.js";

const router = Router();

const triggerSchema = z.object({
  label: z.string().min(1)
});

router.get("/", (_req, res) => {
  const backups = backupService.listBackups();
  res.json({ message: "OK", backups });
});

router.post("/trigger", (req, res, next) => {
  try {
    const payload = triggerSchema.parse(req.body);
    const result = backupService.triggerBackup(payload.label);
    res.status(201).json({ message: "OK", result });
  } catch (error) {
    next(error);
  }
});

export default router;
