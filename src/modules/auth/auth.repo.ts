import { pool } from "../../db";

export async function findAuthUserByEmail(email: string) {
  const res = await pool.query(
    `
    select *
    from auth_users
    where email = $1
    limit 1
    `,
    [email]
  );

  return res.rows[0] ?? null;
}
