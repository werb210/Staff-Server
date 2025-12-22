import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      console.error("LOGIN_FAIL: missing credentials", { emailProvided: !!email });
      return res.status(400).json({ error: "Missing credentials" });
    }

    const user = {
      id: "debug-user",
      email: "admin@example.com",
      passwordHash: await bcrypt.hash("password123", 10)
    };

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      console.error("LOGIN_FAIL: invalid password", { email });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("LOGIN_FAIL: JWT_SECRET missing in environment");
      return res.status(500).json({ error: "Server misconfigured" });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      secret,
      { expiresIn: "1h" }
    );

    return res.status(200).json({ accessToken: token });
  } catch (err) {
    console.error("LOGIN_FATAL", err);
    return res.status(500).json({ error: "Login failed" });
  }
}
