import { pool } from "../../db";

export interface AuthUser {
  id: string;
  email: string;
  password_hash: string;
}

export async function getUserByEmail(email: string): Promise<AuthUser | null> {
  const res = await pool.query<AuthUser>(
    `SELECT id, email, password_hash
     FROM users
     WHERE email = $1
     LIMIT 1`,
    [email.toLowerCase()]
  );

  return res.rows[0] ?? null;
}
