import { randomUUID } from "crypto";
import { pool, runAuthQuery } from "../../db";
import { type PoolClient } from "pg";
import { type Role } from "../../auth/roles";

type Queryable = Pick<PoolClient, "query">;

export interface AuthUser {
  id: string;
  email: string;
  password_hash: string;
  role: Role;
  active: boolean;
  password_changed_at: Date | null;
  failed_login_attempts: number;
  locked_until: Date | null;
  token_version: number;
  password_reset_required: boolean;
}

export async function findAuthUserByEmail(
  email: string,
  client?: Queryable,
  options?: { forUpdate?: boolean }
): Promise<AuthUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const runner = client ?? pool;
  const forUpdate = options?.forUpdate ? " for update" : "";

  const res = await runAuthQuery<AuthUser>(
    runner,
    `select u.id, u.email, u.password_hash, u.role, u.active,
            u.password_changed_at, u.failed_login_attempts,
            u.locked_until, u.token_version,
            coalesce(
              bool_or(pr.used_at is null and pr.expires_at > now()),
              false
            ) as password_reset_required
     from users u
     left join password_resets pr on pr.user_id = u.id
     where lower(u.email) = $1
     group by u.id, u.email, u.password_hash, u.role, u.active,
              u.password_changed_at, u.failed_login_attempts,
              u.locked_until, u.token_version
     order by u.id asc${forUpdate}`,
    [normalizedEmail]
  );

  if (res.rows.length > 1) {
    throw new Error("duplicate_email");
  }

  return res.rows[0] ?? null;
}

export async function findAuthUserById(
  id: string,
  client?: Queryable
): Promise<AuthUser | null> {
  const runner = client ?? pool;

  const res = await runAuthQuery<AuthUser>(
    runner,
    `select u.id, u.email, u.password_hash, u.role, u.active,
            u.password_changed_at, u.failed_login_attempts,
            u.locked_until, u.token_version,
            coalesce(
              bool_or(pr.used_at is null and pr.expires_at > now()),
              false
            ) as password_reset_required
     from users u
     left join password_resets pr on pr.user_id = u.id
     where u.id = $1
     group by u.id, u.email, u.password_hash, u.role, u.active,
              u.password_changed_at, u.failed_login_attempts,
              u.locked_until, u.token_version
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

  const res = await runAuthQuery<AuthUser>(
    runner,
    `insert into users (id, email, password_hash, role, active, password_changed_at)
     values ($1, $2, $3, $4, true, now())
     returning id, email, password_hash, role, active,
              password_changed_at, failed_login_attempts,
               locked_until, token_version,
               false as password_reset_required`,
    [randomUUID(), params.email, params.passwordHash, params.role]
  );

  return res.rows[0];
}

export async function updatePassword(
  userId: string,
  passwordHash: string,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;

  await runAuthQuery(
    runner,
    `update users set password_hash = $1, password_changed_at = now() where id = $2`,
    [passwordHash, userId]
  );
}

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}

export interface PasswordResetRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export async function storeRefreshToken(params: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  client?: Queryable;
}): Promise<void> {
  const runner = params.client ?? pool;
  await runAuthQuery(
    runner,
    `delete from auth_refresh_tokens where user_id = $1`,
    [params.userId]
  );
  await runAuthQuery(
    runner,
    `insert into auth_refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, created_at)
     values ($1, $2, $3, $4, null, now())`,
    [randomUUID(), params.userId, params.tokenHash, params.expiresAt]
  );
}

export async function consumeRefreshToken(
  tokenHash: string,
  client?: Queryable
): Promise<RefreshTokenRecord | null> {
  const runner = client ?? pool;
  const res = await runAuthQuery<RefreshTokenRecord>(
    runner,
    `update auth_refresh_tokens
     set revoked_at = now()
     where token_hash = $1
       and revoked_at is null
     returning id, user_id, token_hash, expires_at, revoked_at, created_at`,
    [tokenHash]
  );
  return res.rows[0] ?? null;
}

export async function revokeRefreshToken(
  tokenHash: string,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  await runAuthQuery(
    runner,
    `update auth_refresh_tokens
     set revoked_at = now()
     where token_hash = $1
       and revoked_at is null`,
    [tokenHash]
  );
}

export async function revokeRefreshTokensForUser(
  userId: string,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  await runAuthQuery(
    runner,
    `update auth_refresh_tokens
     set revoked_at = now()
     where user_id = $1
       and revoked_at is null`,
    [userId]
  );
}

export async function createPasswordReset(params: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  client?: Queryable;
}): Promise<void> {
  const runner = params.client ?? pool;
  await runAuthQuery(
    runner,
    `insert into password_resets (id, user_id, token_hash, expires_at, used_at, created_at)
     values ($1, $2, $3, $4, null, now())`,
    [randomUUID(), params.userId, params.tokenHash, params.expiresAt]
  );
}

export async function findPasswordReset(
  tokenHash: string,
  client?: Queryable
): Promise<PasswordResetRecord | null> {
  const runner = client ?? pool;
  const res = await runAuthQuery<PasswordResetRecord>(
    runner,
    `select id, user_id, token_hash, expires_at, used_at, created_at
     from password_resets
     where token_hash = $1
     limit 1`,
    [tokenHash]
  );
  return res.rows[0] ?? null;
}

export async function markPasswordResetUsed(
  id: string,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  await runAuthQuery(
    runner,
    `update password_resets set used_at = now() where id = $1`,
    [id]
  );
}

export async function incrementTokenVersion(
  userId: string,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  await runAuthQuery(
    runner,
    `update users set token_version = token_version + 1 where id = $1`,
    [userId]
  );
}

export async function recordFailedLogin(
  userId: string,
  lockedUntil: Date | null,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  await runAuthQuery(
    runner,
    `update users
     set failed_login_attempts = failed_login_attempts + 1,
         locked_until = $2
     where id = $1`,
    [userId, lockedUntil]
  );
}

export async function resetLoginFailures(
  userId: string,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  await runAuthQuery(
    runner,
    `update users
     set failed_login_attempts = 0,
         locked_until = null
     where id = $1`,
    [userId]
  );
}

export async function setUserActive(
  userId: string,
  active: boolean,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  await runAuthQuery(
    runner,
    `update users set active = $2 where id = $1`,
    [
    userId,
    active,
    ]
  );
}

export async function updateUserRole(
  userId: string,
  role: Role,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  await runAuthQuery(
    runner,
    `update users set role = $2 where id = $1`,
    [userId, role]
  );
}
