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
    return res.status(503).json({ error: "db_timeout" });
  }

  if (result.rowCount === 0) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const valid = await bcrypt.compare(
    password,
    result.rows[0].password_hash
  );

  if (!valid) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const token = jwt.sign(
    { uid: result.rows[0].id },
    process.env.JWT_SECRET as string,
    { expiresIn: "1h" }
  );

  return res.json({ token });
});

router.post("/logout", (_req, res) => {
  res.json({ ok: true });
});

export default router;
