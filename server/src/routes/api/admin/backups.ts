import { Router } from "express";
const router = Router();

router.get("/", (_req, res) => res.json({ message: "Backups OK" }));

router.post("/", (_req, res) => res.json({ message: "Backup triggered" }));

export default router;
