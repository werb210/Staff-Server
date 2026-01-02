import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "missing_fields" });
  }

  let timeoutHit = false;

  const timeout = setTimeout(() => {
    timeoutHit = true;
    if (!res.headersSent) {
      console.error("AUTH_LOGIN_ERROR Error: timeout");
      res.status(503).json({ error: "db_timeout" });
    }
  }, 5000);

  try {
    const result = await pool.query(
      "SELECT id, password_hash FROM users WHERE email = $1 LIMIT 1",
      [email]
    );

    if (timeoutHit) return;

    clearTimeout(timeout);

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const valid = await bcrypt.compare(password, result.rows[0].password_hash);

    if (!valid) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const token = jwt.sign(
      { userId: result.rows[0].id },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    return res.json({ token });
  } catch (err) {
    clearTimeout(timeout);
    console.error("LOGIN_DB_ERROR", err);
    if (!res.headersSent) {
      return res.status(500).json({ error: "login_failed" });
    }
  }
});

export default router;
