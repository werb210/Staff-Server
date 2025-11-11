import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Service healthy",
    silo: req.silo?.silo ?? "unknown",
    auth: req.silo?.auth.describe(),
  });
});

export default router;
