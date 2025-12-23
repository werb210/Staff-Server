import { Request, Response } from "express";
import { checkVerificationCode } from "../../services/twilio.service.js";

export async function verifySms(req: Request, res: Response): Promise<void> {
  const { phone, code } = req.body;

  const approved = await checkVerificationCode(phone, code);

  if (!approved) {
    res.status(400).json({ error: "Invalid verification code" });
    return;
  }

  res.json({ success: true });
}
