import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db";

const router = Router();

function requireJwtSecret(): string {
  const v = process.env.JWT_SECRET;
  if (!v) throw new Error("JWT_SECRET is not set");
  return v;
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    const result = await pool.query(
      "SELECT id, email, password_hash, role FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(String(password), String(user.password_hash));

    if (!ok) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      requireJwtSecret(),
      { expiresIn: "12h" }
    );

    return res.status(200).json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("AUTH_LOGIN_ERROR", err);
    return res.status(503).json({ error: "db_unavailable" });
  }
});

export default router;
