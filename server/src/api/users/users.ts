import { Request, Response } from "express";
import { pool } from "../../db/pool.js";

export async function listUsers(
  _req: Request,
  res: Response
): Promise<void> {
  const { rows } = await pool.query(
    "SELECT id, email FROM users ORDER BY email"
  );

  res.json(rows);
}
