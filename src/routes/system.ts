import { Router } from "express";

const router = Router();

router.get("/status", (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
