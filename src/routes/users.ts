import { Router } from "express";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, (_req, res) => {
  res.json({ status: "ok" });
});

export default router;
