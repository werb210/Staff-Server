import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "../../db/client.js";
import { users } from "../../db/schema/users.js";
import { eq, type InferSelectModel } from "drizzle-orm";

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then((rows: InferSelectModel<typeof users>[]) => rows[0]);

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET missing");
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: "1h" }
    );

    return res.json({ accessToken: token });
  } catch (err) {
    console.error("LOGIN_ERROR", err);
    return res.status(500).json({ error: "Login failed" });
  }
}
