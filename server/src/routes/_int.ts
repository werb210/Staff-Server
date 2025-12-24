import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.get("/routes", (_req, res) => {
  res.json({ internal: true });
});

export default router;
