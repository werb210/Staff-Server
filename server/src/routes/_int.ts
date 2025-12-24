import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

router.get("/routes", (_req, res) => {
  res.status(200).json({
    routes: [
      "/_int/health",
      "/_int/routes",
    ],
  });
});

export default router;
