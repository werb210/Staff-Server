import { Router } from "express";

let ready = false;

export function markReady() {
  ready = true;
}

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

router.get("/ready", (_req, res) => {
  if (!ready) return res.status(503).json({ ok: false });
  res.status(200).json({ ok: true });
});

export default router;
