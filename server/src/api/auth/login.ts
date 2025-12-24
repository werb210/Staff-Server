import { Request, Response } from "express";
import { signAccessToken } from "../../services/jwt.service.js";
import { getUserByEmail } from "../../services/user.service.js";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await getUserByEmail(email);
  if (!user || !(await user.verifyPassword(password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signAccessToken({
    sub: user.id,
    email: user.email,
  });

  res.json({ accessToken: token });
}
