import { Router } from "express";

const router = Router();

router.post("/otp/start", async (_req, res) => {
  return res.status(200).json({ sent: true });
});

router.post("/otp/verify", async (_req, res) => {
  return res.status(200).json({
    token: "dev-token",
  });
});

export default router;
