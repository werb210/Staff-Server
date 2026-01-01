import { Router } from "express";

const router = Router();

router.post("/login", (_req, res) => {
  res.status(200).json({ ok: true });
});

router.post("/logout", (_req, res) => {
  res.status(200).json({ ok: true });
});

router.post("/refresh", (_req, res) => {
  res.status(200).json({ ok: true });
});

export default router;
