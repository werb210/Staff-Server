// server/src/api/auth/login.ts
import { Request, Response } from "express";

import { verifyUserCredentials } from "../../services/authService";
import { generateAccessToken } from "../../utils/jwt";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const user = await verifyUserCredentials(email, password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const { token: accessToken } = generateAccessToken(user);

  return res.status(200).json({
    accessToken,
    user,
  });
}
