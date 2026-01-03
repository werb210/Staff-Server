import { pool } from "../../db";

export interface AuthUser {
  id: string;
  email: string;
  password_hash: string;
  role: string;
}

export async function findAuthUserByEmail(
  email: string
): Promise<AuthUser | null> {
  const res = await pool.query<AuthUser>(
    `select id, email, password_hash, role
     from users
     where email = $1
     limit 1`,
    [email]
  );

  return res.rows[0] ?? null;
}
