// server/src/api/auth/login.ts

import { Request, Response } from "express";
import { signAccessToken } from "../../services/jwt.service.js";
import { getUserByEmailAndPassword } from "../../services/user.service.js";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await getUserByEmailAndPassword(email, password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
  });

  res.json({ accessToken });
}
