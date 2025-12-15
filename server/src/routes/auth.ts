import type { Request, Response } from "express";
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db";

const router = Router();

function requireJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET missing");
  return secret;
}

async function loginHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }

    const result = await pool.query(
      `
      select id, email, password_hash, role, status
      from users
      where lower(email) = lower($1)
      limit 1
      `,
      [String(email)]
    );

    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "invalid credentials" });
    if (user.status !== "active") return res.status(403).json({ error: "user inactive" });

    const ok = await bcrypt.compare(String(password), String(user.password_hash));
    if (!ok) return res.status(401).json({ error: "invalid credentials" });

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      requireJwtSecret(),
      { expiresIn: "12h" }
    );

    return res.status(200).json({
      token,
      user: { id: user.id, email: user.email, role: user.role, status: user.status },
    });
  } catch (e: any) {
    return res.status(500).json({ error: "login_failed", detail: String(e?.message ?? e) });
  }
}

// IMPORTANT: support the exact endpoint your Staff Portal is calling
router.post("/api/auth/login", loginHandler);

// Optional alias (useful for sanity)
router.post("/auth/login", loginHandler);

export default router;
