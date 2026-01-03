import { randomUUID } from "crypto";
import { pool } from "../../db";

export interface AuthUser {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  active: boolean;
}

export async function findAuthUserByEmail(
  email: string
): Promise<AuthUser | null> {
  const res = await pool.query<AuthUser>(
    `select id, email, password_hash, role, active
     from users
     where email = $1
     limit 1`,
    [email]
  );

  return res.rows[0] ?? null;
}

export async function findAuthUserById(id: string): Promise<AuthUser | null> {
  const res = await pool.query<AuthUser>(
    `select id, email, password_hash, role, active
     from users
     where id = $1
     limit 1`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function createUser(params: {
  email: string;
  passwordHash: string;
  role: string;
}): Promise<AuthUser> {
  const res = await pool.query<AuthUser>(
    `insert into users (id, email, password_hash, role, active, password_changed_at)
     values ($1, $2, $3, $4, true, now())
     returning id, email, password_hash, role, active`,
    [randomUUID(), params.email, params.passwordHash, params.role]
  );
  return res.rows[0];
}

export async function setUserActive(
  userId: string,
  active: boolean
): Promise<void> {
  await pool.query(
    `update users set active = $1 where id = $2`,
    [active, userId]
  );
}

export async function updatePassword(
  userId: string,
  passwordHash: string
): Promise<void> {
  await pool.query(
    `update users set password_hash = $1, password_changed_at = now()
     where id = $2`,
    [passwordHash, userId]
  );
}

export type RefreshTokenRecord = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
};

export async function storeRefreshToken(params: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await pool.query(
    `insert into refresh_tokens (id, user_id, token_hash, expires_at, revoked_at)
     values ($1, $2, $3, $4, null)`,
    [randomUUID(), params.userId, params.tokenHash, params.expiresAt]
  );
}

export async function findRefreshToken(
  tokenHash: string
): Promise<RefreshTokenRecord | null> {
  const res = await pool.query<RefreshTokenRecord>(
    `select id, user_id, token_hash, expires_at, revoked_at
     from refresh_tokens
     where token_hash = $1
     limit 1`,
    [tokenHash]
  );
  return res.rows[0] ?? null;
}

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await pool.query(
    `update refresh_tokens
     set revoked_at = now()
     where token_hash = $1`,
    [tokenHash]
  );
}

export type PasswordResetRecord = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
};

export async function createPasswordReset(params: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await pool.query(
    `insert into password_resets (id, user_id, token_hash, expires_at, used_at)
     values ($1, $2, $3, $4, null)`,
    [randomUUID(), params.userId, params.tokenHash, params.expiresAt]
  );
}

export async function findPasswordReset(
  tokenHash: string
): Promise<PasswordResetRecord | null> {
  const res = await pool.query<PasswordResetRecord>(
    `select id, user_id, token_hash, expires_at, used_at
     from password_resets
     where token_hash = $1
     limit 1`,
    [tokenHash]
  );
  return res.rows[0] ?? null;
}

export async function markPasswordResetUsed(id: string): Promise<void> {
  await pool.query(
    `update password_resets set used_at = now() where id = $1`,
    [id]
  );
}
