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

  let result;
  try {
    result = await pool.query(
      "SELECT id, password_hash FROM users WHERE email = $1 LIMIT 1",
      [email]
    );
  } catch (err) {
    console.error("LOGIN_DB_ERROR", err);
    return res.status(503).json({ error: "db_unavailable" });
  }

  if (result.rowCount === 0) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const { id, password_hash } = result.rows[0];

  const ok = await bcrypt.compare(password, password_hash);
  if (!ok) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const token = jwt.sign(
    { userId: id },
    process.env.JWT_SECRET!,
    { expiresIn: "1d" }
  );

  return res.json({ token });
});

export default router;
