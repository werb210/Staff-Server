import { Router } from "express";

const router = Router();

router.get("/token", (_req, res) => {
  res.status(200).json({
    token: "fake-telephony-token",
  });
});

export default router;
