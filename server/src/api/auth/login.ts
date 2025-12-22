import { Request, Response } from "express";
import { db } from "../../db/index.js";
import { PasswordService } from "../../services/password.service.js";
import { JwtService } from "../../services/jwt.service.js";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as {
    email: string;
    password: string;
  };

  const user = db.users.find(u => u.email === email);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await PasswordService.comparePassword(
    password,
    user.passwordHash
  );

  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = JwtService.sign({
    userId: user.id,
    email: user.email,
  });

  return res.json({ token });
}
