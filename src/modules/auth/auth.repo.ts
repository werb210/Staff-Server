import { randomUUID } from "crypto";
import { pool } from "../../db";
import { type PoolClient } from "pg";
import { type Role } from "../../auth/roles";

type Queryable = Pick<PoolClient, "query">;

export interface AuthUser {
  id: string;
  email: string;
  password_hash: string;
  role: Role;
  active: boolean;
  password_changed_at?: Date | null;
  failed_login_attempts: number;
  locked_until: Date | null;
  token_version: number;
}

async function hasPasswordChangedAtColumn(
  client?: Queryable
): Promise<boolean> {
  const runner = client ?? pool;
  const res = await runner.query(
    `select 1
     from information_schema.columns
     where table_name = 'users' and column_name = 'password_changed_at'
     limit 1`
  );
  return (res.rowCount ?? 0) > 0;
}

export async function findAuthUserByEmail(
  email: string
): Promise<AuthUser | null> {
  const hasPasswordChangedAt = await hasPasswordChangedAtColumn();
  const columns = hasPasswordChangedAt
    ? "id, email, password_hash, role, active, password_changed_at, failed_login_attempts, locked_until, token_version"
    : "id, email, password_hash, role, active, failed_login_attempts, locked_until, token_version";
  const res = await pool.query<AuthUser>(
    `select ${columns}
     from users
     where email = $1
     limit 1`,
    [email]
  );

  return res.rows[0] ?? null;
}

export async function findAuthUserById(id: string): Promise<AuthUser | null> {
  const hasPasswordChangedAt = await hasPasswordChangedAtColumn();
  const columns = hasPasswordChangedAt
    ? "id, email, password_hash, role, active, password_changed_at, failed_login_attempts, locked_until, token_version"
    : "id, email, password_hash, role, active, failed_login_attempts, locked_until, token_version";
  const res = await pool.query<AuthUser>(
    `select ${columns}
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
  role: Role;
  client?: Queryable;
}): Promise<AuthUser> {
  const runner = params.client ?? pool;
  const hasPasswordChangedAt = await hasPasswordChangedAtColumn(runner);
  const columns = hasPasswordChangedAt
    ? "(id, email, password_hash, role, active, password_changed_at)"
    : "(id, email, password_hash, role, active)";
  const values = hasPasswordChangedAt
    ? "($1, $2, $3, $4, true, now())"
    : "($1, $2, $3, $4, true)";
  const returning = hasPasswordChangedAt
    ? "id, email, password_hash, role, active, password_changed_at, failed_login_attempts, locked_until, token_version"
    : "id, email, password_hash, role, active, failed_login_attempts, locked_until, token_version";
  const res = await runner.query<AuthUser>(
    `insert into users ${columns}
     values ${values}
     returning ${returning}`,
    [randomUUID(), params.email, params.passwordHash, params.role]
  );
  return res.rows[0];
}

export async function setUserActive(
  userId: string,
  active: boolean,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  await runner.query(
    `update users set active = $1 where id = $2`,
    [active, userId]
  );
}

export async function updatePassword(
  userId: string,
  passwordHash: string,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  const hasPasswordChangedAt = await hasPasswordChangedAtColumn(runner);
  const setClause = hasPasswordChangedAt
    ? "password_hash = $1, password_changed_at = now()"
    : "password_hash = $1";
  await runner.query(
    `update users set ${setClause}
     where id = $2`,
    [passwordHash, userId]
  );
}

export async function updateUserRole(
  userId: string,
  role: Role,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  await runner.query(`update users set role = $1 where id = $2`, [
    role,
    userId,
  ]);
}

export async function incrementTokenVersion(
  userId: string,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  await runner.query(
    `update users set token_version = token_version + 1 where id = $1`,
    [userId]
  );
}

export async function resetLoginFailures(
  userId: string,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  await runner.query(
    `update users set failed_login_attempts = 0, locked_until = null where id = $1`,
    [userId]
  );
}

export async function recordFailedLogin(
  userId: string,
  lockUntil: Date | null,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  await runner.query(
    `update users
     set failed_login_attempts = failed_login_attempts + 1,
         locked_until = $2
     where id = $1`,
    [userId, lockUntil]
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
  client?: Queryable;
}): Promise<void> {
  const runner = params.client ?? pool;
  await runner.query(
    `insert into auth_refresh_tokens
     (id, user_id, token_hash, expires_at, revoked_at, created_at)
     values ($1, $2, $3, $4, null, now())`,
    [randomUUID(), params.userId, params.tokenHash, params.expiresAt]
  );
}

export async function revokeRefreshToken(
  tokenHash: string,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  await runner.query(
    `update auth_refresh_tokens
     set revoked_at = now()
     where token_hash = $1 and revoked_at is null`,
    [tokenHash]
  );
}

export async function revokeRefreshTokensForUser(
  userId: string,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  await runner.query(
    `update auth_refresh_tokens
     set revoked_at = now()
     where user_id = $1 and revoked_at is null`,
    [userId]
  );
}

export async function consumeRefreshToken(
  tokenHash: string,
  client?: Queryable
): Promise<RefreshTokenRecord | null> {
  const runner = client ?? pool;
  const res = await runner.query<RefreshTokenRecord>(
    `update auth_refresh_tokens
     set revoked_at = now()
     where token_hash = $1 and revoked_at is null
     returning id, user_id, token_hash, expires_at, revoked_at`,
    [tokenHash]
  );
  return res.rows[0] ?? null;
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
    `insert into password_resets (id, user_id, token_hash, expires_at, used_at, created_at)
     values ($1, $2, $3, $4, null, now())`,
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
