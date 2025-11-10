import { Router } from "express";
import { backupService } from "../../../services/backupService.js";

const router = Router();

/**
 * GET /api/admin/backups
 * Returns stubbed backup metadata.
 */
router.get("/", (_req, res) => {
  const backups = backupService.listBackups();
  res.json({ message: "Backups retrieved", backups });
});

export default router;
