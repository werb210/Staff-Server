import { pool } from "../../db";
import type { AuthUserRecord } from "./auth.types";

/**
 * Auth user lookup used by the login flow.
 * NOTE: This function MUST exist because auth.service imports it.
 */
export async function findAuthUserByEmail(email: string): Promise<AuthUserRecord | null> {
  const e = email.trim().toLowerCase();

  const result = await pool.query(
    `
    SELECT
      id::text as "id",
      password_hash as "passwordHash"
    FROM users
    WHERE lower(email) = $1
    LIMIT 1
    `,
    [e],
  );

  return (result.rows[0] as AuthUserRecord | undefined) ?? null;
}

/**
 * Backwards-compatible alias (older code imports getUserByEmail).
 */
export async function getUserByEmail(email: string): Promise<AuthUserRecord | null> {
  return findAuthUserByEmail(email);
}
