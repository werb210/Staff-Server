import { Request, Response } from "express";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { PasswordService } from "../../services/password.service.js";
import { JwtService } from "../../services/jwt.service.js";
import { eq } from "drizzle-orm";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as {
    email: string;
    password: string;
  };

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await PasswordService.verifyPassword(
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
