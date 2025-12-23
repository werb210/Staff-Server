import { Request, Response } from "express";
import { verifyPassword } from "../../services/password.service.js";
import { signAccessToken } from "../../services/jwt.service.js";
import { pool } from "../../db/pool.js";

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const { rows } = await pool.query(
    "SELECT id, email, password_hash FROM users WHERE email = $1",
    [email]
  );

  if (rows.length === 0) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const user = rows[0];

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signAccessToken({
    userId: user.id,
    email: user.email
  });

  res.json({ token });
}
