import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true });
});

router.get("/build", (_req, res) => {
  res.json({
    service: "staff-server",
    status: "running"
  });
});

export default router;
