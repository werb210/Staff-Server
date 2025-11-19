// server/src/routes/health.routes.ts
import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.status(200).json({
    ok: true,
    status: "healthy",
    ts: Date.now(),
  });
});

export default router;
