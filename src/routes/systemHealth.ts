import { Router } from "express";

const router = Router();

router.get("/system/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

export default router;
