import { Request, Response } from "express";
import { db } from "../../db/index.js";
import { PasswordService } from "../../services/password.service.js";

export async function createUser(req: Request, res: Response) {
  const { email, password } = req.body as {
    email: string;
    password: string;
  };

  if (!email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const existing = db.users.find(u => u.email === email);
  if (existing) {
    return res.status(409).json({ error: "User exists" });
  }

  const passwordHash = await PasswordService.hashPassword(password);

  const user = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
  };

  db.users.push(user);

  return res.status(201).json({
    id: user.id,
    email: user.email,
  });
}
