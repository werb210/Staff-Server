import { Router } from "express";
import { z } from "zod";
import { isPlaceholderSilo, respondWithPlaceholder } from "../../utils/placeholder.js";

const router = Router();

router.get("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const backups = req.silo!.services.backups.listBackups();
  res.json({ message: "OK", data: backups });
});

router.post("/create", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const payload = z.object({ name: z.string().min(1) }).safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ message: "Invalid backup payload" });
  }
  const backup = req.silo!.services.backups.createBackup(payload.data.name);
  res.status(201).json({ message: "OK", data: backup });
});

export default router;
