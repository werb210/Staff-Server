import type { Request, Response } from "express";
import { checkVerificationCode } from "../../services/twilio.service.js";

export async function verifySms(req: Request, res: Response) {
  const { to, code } = req.body;

  if (!to || !code) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const result = await checkVerificationCode(to, code);

  res.json({ result });
}
