import type { Request, Response } from "express";
import { checkVerificationCode } from "../../services/twilio.service.js";

export async function verifySms(req: Request, res: Response) {
  const { to, code } = req.body;

  const result = await checkVerificationCode(to, code);

  if (result.status !== "approved") {
    return res.status(401).json({ error: "Invalid code" });
  }

  res.json({ success: true });
}
