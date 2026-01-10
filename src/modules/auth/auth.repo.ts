import { randomUUID } from "crypto";
import { isPgMem, pool, runAuthQuery } from "../../db";
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

export interface AuthUserBase {
  id: string;
  email: string;
  role: Role;
  active: boolean;
  failed_login_attempts: number;
  locked_until: Date | null;
  token_version: number;
}

export interface AuthPasswordMetadata {
  password_hash: string;
  password_changed_at?: Date | null;
}

/**
 * IMPORTANT:
 * - information_schema is schema-wide
 * - Azure Postgres WILL lie unless schema is constrained
 * - Cache result to avoid per-request metadata scans
 */
let cachedHasPasswordChangedAt: boolean | null = null;

async function hasPasswordChangedAtColumn(
  client?: Queryable
): Promise<boolean> {
  if (cachedHasPasswordChangedAt !== null && !isPgMem) {
    return cachedHasPasswordChangedAt;
  }

  const runner = client ?? pool;

  const res = await runAuthQuery(
    runner,
    `
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'password_changed_at'
    limit 1
    `
  );

  const hasColumn = (res.rowCount ?? 0) > 0;
  if (!isPgMem) {
    cachedHasPasswordChangedAt = hasColumn;
  }
  return hasColumn;
}

export async function findAuthUserByEmail(
  email: string
): Promise<AuthUser | null> {
  const hasPasswordChangedAt = await hasPasswordChangedAtColumn();
  const normalizedEmail = email.trim().toLowerCase();

  const columns = hasPasswordChangedAt
    ? `
      id, email, password_hash, role, active,
      password_changed_at, failed_login_attempts,
      locked_until, token_version
    `
    : `
      id, email, password_hash, role, active,
      failed_login_attempts, locked_until, token_version
    `;

  const res = await runAuthQuery<AuthUser>(
    pool,
    `select ${columns}
     from users
     where lower(email) = $1
     order by id asc`,
    [normalizedEmail]
  );

  if (res.rows.length > 1) {
    throw new Error("duplicate_email");
  }

  return res.rows[0] ?? null;
}

export async function findAuthUserByEmailBase(
  email: string
): Promise<AuthUserBase | null> {
  const normalizedEmail = email.trim().toLowerCase();

  const res = await runAuthQuery<AuthUserBase>(
    pool,
    `select id, email, role, active, failed_login_attempts, locked_until, token_version
     from users
     where lower(email) = $1
     order by id asc`,
    [normalizedEmail]
  );

  if (res.rows.length > 1) {
    throw new Error("duplicate_email");
  }

  return res.rows[0] ?? null;
}

export async function findAuthPasswordMetadata(
  userId: string,
  client?: Queryable
): Promise<AuthPasswordMetadata | null> {
  const runner = client ?? pool;
  const hasPasswordChangedAt = await hasPasswordChangedAtColumn(runner);
  const columns = hasPasswordChangedAt
    ? "password_hash, password_changed_at"
    : "password_hash";

  const res = await runAuthQuery<AuthPasswordMetadata>(
    runner,
    `select ${columns} from users where id = $1 limit 1`,
    [userId]
  );

  if (!res.rows[0]) {
    return null;
  }

  if (!hasPasswordChangedAt) {
    return { ...res.rows[0], password_changed_at: null };
  }

  return res.rows[0];
}

export async function findAuthUserById(
  id: string,
  client?: Queryable
): Promise<AuthUser | null> {
  const hasPasswordChangedAt = await hasPasswordChangedAtColumn();
  const runner = client ?? pool;

  const columns = hasPasswordChangedAt
    ? `
      id, email, password_hash, role, active,
      password_changed_at, failed_login_attempts,
      locked_until, token_version
    `
    : `
      id, email, password_hash, role, active,
      failed_login_attempts, locked_until, token_version
    `;

  const res = await runAuthQuery<AuthUser>(
    runner,
    `select ${columns} from users where id = $1 limit 1`,
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
    ? `(id, email, password_hash, role, active, password_changed_at)`
    : `(id, email, password_hash, role, active)`;

  const values = hasPasswordChangedAt
    ? `($1, $2, $3, $4, true, now())`
    : `($1, $2, $3, $4, true)`;

  const returning = hasPasswordChangedAt
    ? `
      id, email, password_hash, role, active,
      password_changed_at, failed_login_attempts,
      locked_until, token_version
    `
    : `
      id, email, password_hash, role, active,
      failed_login_attempts, locked_until, token_version
    `;

  const res = await runAuthQuery<AuthUser>(
    runner,
    `insert into users ${columns}
     values ${values}
     returning ${returning}`,
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
  const hasPasswordChangedAt = await hasPasswordChangedAtColumn(runner);

  const setClause = hasPasswordChangedAt
    ? `password_hash = $1, password_changed_at = now()`
    : `password_hash = $1`;

  await runAuthQuery(
    runner,
    `update users set ${setClause} where id = $2`,
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

export async function hasActivePasswordReset(
  userId: string,
  client?: Queryable
): Promise<boolean> {
  const runner = client ?? pool;
  const res = await runAuthQuery(
    runner,
    `select 1 from password_resets
     where user_id = $1
       and used_at is null
       and expires_at > now()::timestamp
     limit 1`,
    [userId]
  );
  return (res.rowCount ?? 0) > 0;
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
