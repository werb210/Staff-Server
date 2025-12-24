import { Request, Response } from "express";
import userService from "../../services/user.service";
import { signAccessToken } from "../../services/jwt.service";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await userService.authenticate(email, password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signAccessToken({
    sub: user.id,
    email: user.email,
  });

  res.json({ accessToken: token });
}
