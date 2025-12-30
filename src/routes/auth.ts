import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "missing_fields" });
  }

  const r = await pool.query("select id, password_hash from users where email=$1", [
    email,
  ]);

  if (r.rowCount === 0) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const ok = await bcrypt.compare(password, r.rows[0].password_hash);
  if (!ok) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const token = jwt.sign({ uid: r.rows[0].id }, process.env.JWT_SECRET!, {
    expiresIn: "1h",
  });

  return res.json({ token });
});

export default router;
