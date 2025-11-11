import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ message: "OK", commit: process.env.GIT_COMMIT ?? "unknown" });
});

export default router;
