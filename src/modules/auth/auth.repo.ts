import { pool } from "../../db";

export async function getUserByEmail(email: string) {
  const result = await pool.query(
    `select * from users where email = $1 limit 1`,
    [email]
  );

  return result.rows[0] ?? null;
}
