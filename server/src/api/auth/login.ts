import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "../../db/client.js";
import { users } from "../../db/schema/users.js";
import { eq } from "drizzle-orm";

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: "JWT_SECRET missing" });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      secret,
      { expiresIn: "1h" }
    );

    return res.json({ accessToken: token });
  } catch (err) {
    console.error("LOGIN_FATAL", err);
    return res.status(500).json({ error: "Login failed" });
  }
}
