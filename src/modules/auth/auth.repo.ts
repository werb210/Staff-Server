import { getPool } from "../../db";
import { type AuthUserRecord } from "./auth.types";

export async function findAuthUserByEmail(email: string): Promise<AuthUserRecord | null> {
  const pool = getPool();
  const result = await pool.query("select id, password_hash from users where email=$1", [
    email,
  ]);

  if (result.rowCount === 0) {
    return null;
  }

  return { id: result.rows[0].id, passwordHash: result.rows[0].password_hash };
}
