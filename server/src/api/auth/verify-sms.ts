import { Request, Response } from "express";
import { checkVerificationCode } from "../../services/twilio.service";

export async function verifySms(req: Request, res: Response) {
  const { phone, code } = req.body;

  const result = await checkVerificationCode(phone, code);

  if (result.status !== "approved") {
    return res.status(401).json({ error: "Invalid code" });
  }

  res.json({ ok: true });
}
