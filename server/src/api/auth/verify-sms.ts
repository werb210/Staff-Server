import { Request, Response } from "express";
import { db } from "../../db";
import { signJwt } from "../../services/jwt.service";

export async function verifySms(req: Request, res: Response) {
  const { email, code } = req.body;

  const user = await db.users.findFirst({
    where: { email: email.toLowerCase() },
  });

  if (!user || !user.sms_2fa_code || !user.sms_2fa_expires) {
    return res.status(401).json({ error: "Invalid verification attempt" });
  }

  if (new Date() > user.sms_2fa_expires) {
    return res.status(401).json({ error: "Code expired" });
  }

  if (user.sms_2fa_code !== code) {
    return res.status(401).json({ error: "Invalid code" });
  }

  // clear 2FA temp fields
  await db.users.update({
    where: { id: user.id },
    data: {
      sms_2fa_code: null,
      sms_2fa_expires: null,
    },
  });

  const token = signJwt({ userId: user.id });

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
}
