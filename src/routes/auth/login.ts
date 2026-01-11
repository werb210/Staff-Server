import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../../db";

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ code: "missing_credentials" });
    }

    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, email),
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ code: "invalid_credentials" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ code: "invalid_credentials" });
    }

    return res.status(200).json({
      userId: user.id,
      email: user.email,
    });
  } catch (err) {
    console.error("LOGIN_FAILED", err);
    return res.status(500).json({ code: "auth_error" });
  }
}
