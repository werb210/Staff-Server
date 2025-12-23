import { Request, Response } from "express";
import { db } from "../../db";
import { verifyPassword } from "../../services/password.service";
import { signJwt } from "../../services/jwt.service";
import { sendSmsCode } from "../../services/twilio.service";
import crypto from "crypto";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await db.users.findFirst({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // ✅ SMS 2FA PATH
  if (user.sms_2fa_enabled) {
    if (!user.phone_number) {
      return res.status(500).json({
        error: "SMS 2FA enabled but phone number missing",
      });
    }

    const code = crypto.randomInt(100000, 999999).toString();

    await db.users.update({
      where: { id: user.id },
      data: {
        sms_2fa_code: code,
        sms_2fa_expires: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    await sendSmsCode(user.phone_number, code);

    return res.json({
      two_factor_required: true,
      method: "sms",
    });
  }

  // ✅ NORMAL LOGIN
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
