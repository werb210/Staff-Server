import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.get("/routes", (_req, res) => {
  res.status(200).json({
    mounted: ["/_int/health", "/_int/routes"],
  });
});

export default router;
