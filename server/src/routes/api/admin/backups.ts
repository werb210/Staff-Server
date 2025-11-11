import { Router } from "express";
import { z } from "zod";
import { backupService } from "../../../services/backupService.js";
import { logError, logInfo } from "../../../utils/logger.js";

const router = Router();

const BackupSchema = z.object({
  name: z.string().min(1),
});

// Returns metadata for the most recent backups.
router.get("/", (_req, res) => {
  logInfo("Listing backups");
  res.json({ message: "OK", data: backupService.listBackups() });
});

// Creates a new backup snapshot.
router.post("/", (req, res) => {
  try {
    const payload = BackupSchema.parse(req.body);
    logInfo("Creating backup", payload);
    const backup = backupService.createBackup(payload.name);
    res.status(201).json({ message: "OK", data: backup });
  } catch (error) {
    logError("Failed to create backup", error);
    res.status(400).json({ message: "Unable to create backup" });
  }
});

export default router;
