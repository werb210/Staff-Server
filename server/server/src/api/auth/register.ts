import { Request, Response } from "express";
import { hashPassword } from "../../services/password.service.js";
import { pool } from "../../db/pool.js";

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  const passwordHash = await hashPassword(password);

  await pool.query(
    "INSERT INTO users (email, password_hash) VALUES ($1, $2)",
    [email, passwordHash]
  );

  res.status(201).json({ success: true });
}
