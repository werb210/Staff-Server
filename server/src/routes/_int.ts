import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

router.get("/routes", (_req, res) => {
  res.json({
    routes: ["GET /_int/health", "GET /_int/routes"]
  });
});

export default router;
