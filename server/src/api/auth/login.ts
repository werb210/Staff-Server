import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../../db";
import { users } from "../../db/schema";
import { eq } from "drizzle-orm";
import { signJwt } from "../../services/jwt.service";

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signJwt({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
