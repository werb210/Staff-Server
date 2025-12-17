import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/build", (_req, res) => {
  res.json({
    name: "staff-server",
    env: process.env.NODE_ENV || "unknown",
  });
});

export default router;
