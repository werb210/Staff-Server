import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  return res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

export default router;
