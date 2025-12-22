import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "../../db"; // adjust if your db import differs

export async function login(
  req: Request,
  res: Response,
  _next: NextFunction
) {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      console.error("LOGIN_FAIL: missing credentials", { emailProvided: !!email });
      return res.status(400).json({ error: "Missing credentials" });
    }

    // 🔹 FETCH REAL USER
    const user = await db.users.findFirst({
      where: { email }
    });

    if (!user) {
      console.error("LOGIN_FAIL: user not found", { email });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 🔹 CORRECT PASSWORD CHECK
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      console.error("LOGIN_FAIL: invalid password", { email });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("LOGIN_FAIL: JWT_SECRET missing");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role
      },
      secret,
      { expiresIn: "1h" }
    );

    return res.status(200).json({ accessToken: token });
  } catch (err) {
    console.error("LOGIN_FATAL", err);
    return res.status(500).json({ error: "Login failed" });
  }
}
