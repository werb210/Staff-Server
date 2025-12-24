import { checkVerificationCode } from "../../services/twilio.service.js";
import type { Request, Response } from "express";

export async function verifySms(req: Request, res: Response) {
  const { to, code } = req.body;
  await checkVerificationCode(to, code);
  res.sendStatus(204);
}
