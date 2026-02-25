import { Router } from "express";
import { otpService } from "./otpService";

const router = Router();

router.post("/otp/start", async (_req, res) => {
  const result = await otpService.createVerification();
  res.status(200).json(result);
});

export default router;
