import { Request, Response } from "express";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { verifyUserCredentials } from "../../services/authService";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await verifyUserCredentials(email, password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  return res.status(200).json({
    accessToken,
    refreshToken,
    user
  });
}
