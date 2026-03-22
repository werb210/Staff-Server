import { Router } from "express";

const router = Router();

router.post("/", (_req, res) => {
  res.json({ success: true });
});

export default router;
