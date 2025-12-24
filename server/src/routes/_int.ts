import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

router.get("/build", (_req, res) => {
  res.status(200).json({ build: "ok" });
});

export default router;
