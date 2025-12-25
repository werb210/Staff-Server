import type { Request, Response } from "express";

export async function verifySms(req: Request, res: Response) {
  const { to, code } = req.body;

  const { checkVerificationCode } = await import(
    "../../services/twilio.service.js"
  );
  const result = await checkVerificationCode(to, code);

  if (result.status !== "approved") {
    return res.status(401).json({ error: "Invalid code" });
  }

  res.json({ success: true });
}
