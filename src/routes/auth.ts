import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db";

const router = Router();

/**
 * Utility: enforce hard timeout on async ops
 */
function withTimeout<T>(p: Promise<T>, ms = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * POST /api/auth/login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const result = await withTimeout(
      pool.query(
        "SELECT id, password_hash FROM users WHERE email = $1",
        [email]
      ),
      3000
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const valid = await withTimeout(
      bcrypt.compare(password, result.rows[0].password_hash),
      2000
    );

    if (!valid) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const token = jwt.sign(
      { uid: result.rows[0].id },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    return res.status(200).json({ token });
  } catch (err) {
    console.error("AUTH_LOGIN_ERROR", err);
    return res.status(500).json({ error: "auth_failed" });
  }
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", (_req, res) => {
  return res.status(200).json({ status: "ok" });
});

/**
 * POST /api/auth/refresh
 */
router.post("/refresh", (_req, res) => {
  return res.status(501).json({ error: "not_implemented" });
});

export default router;
