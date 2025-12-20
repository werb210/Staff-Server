import { Request, Response } from "express";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { verifyUserCredentials } from "../../services/authService";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await verifyUserCredentials(email, password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  return res.status(200).json({
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
    user,
  });
}
