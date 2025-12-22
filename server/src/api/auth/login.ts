import { comparePassword } from "../../services/password.service.js";
import { signJwt } from "../../services/jwt.service.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import type { Request, Response } from "express";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then(r => r[0]);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await comparePassword(password, user.passwordHash);

  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signJwt({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return res.json({ token });
}
