import { randomUUID } from "crypto";
import { pool } from "../../db";
import { isPgMemRuntime } from "../../dbRuntime";
import { type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { type Role } from "../../auth/roles";

type Queryable = Pick<PoolClient, "query">;

async function runAuthQuery<T extends QueryResultRow = QueryResultRow>(
  runner: Queryable,
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  try {
    return await runner.query<T>(text, params);
  } catch (err: any) {
    console.error("[AUTH QUERY ERROR]", err?.message ?? "unknown_error");
    throw err;
  }
}

export interface AuthUser {
  id: string;
  email: string | null;
  phoneNumber: string;
  phoneVerified: boolean;
  role: Role;
  active: boolean;
  tokenVersion: number;
}

export async function findAuthUserByPhone(
  phoneNumber: string,
  client?: Queryable,
  options?: { forUpdate?: boolean }
): Promise<AuthUser | null> {
  const runner = client ?? pool;
  const forUpdate = options?.forUpdate ? " for update" : "";

  const res = await runAuthQuery<AuthUser>(
    runner,
    `select u.id,
            u.email,
            u.phone_number as "phoneNumber",
            u.phone_verified as "phoneVerified",
            u.role,
            u.active,
            u.token_version as "tokenVersion"
     from users u
     where u.phone_number = $1
     order by u.id asc${forUpdate}`,
    [phoneNumber]
  );

  return res.rows[0] ?? null;
}

export async function findAuthUserById(
  id: string,
  client?: Queryable
): Promise<AuthUser | null> {
  const runner = client ?? pool;

  const res = await runAuthQuery<AuthUser>(
    runner,
    `select u.id,
            u.email,
            u.phone_number as "phoneNumber",
            u.phone_verified as "phoneVerified",
            u.role,
            u.active,
            u.token_version as "tokenVersion"
     from users u
     where u.id = $1
     limit 1`,
    [id]
  );

  return res.rows[0] ?? null;
}

export async function createUser(params: {
  email?: string | null;
  phoneNumber: string;
  role: Role;
  client?: Queryable;
}): Promise<AuthUser> {
  const runner = params.client ?? pool;
  const normalizedEmail = params.email ? params.email.trim().toLowerCase() : null;
  const resolvedEmail =
    normalizedEmail ??
    (isPgMemRuntime() ? `pgmem-${randomUUID()}@example.com` : null);

  const res = await runAuthQuery<AuthUser>(
    runner,
    `insert into users (id, email, phone_number, role, active)
     values ($1, $2, $3, $4, true)
     returning id,
              email,
              phone_number as "phoneNumber",
              phone_verified as "phoneVerified",
              role,
              active,
              token_version as "tokenVersion"`,
    [randomUUID(), resolvedEmail, params.phoneNumber, params.role]
  );

  return res.rows[0];
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
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
       and expires_at > now()
     returning id,
              user_id as "userId",
              token_hash as "tokenHash",
              expires_at as "expiresAt",
              revoked_at as "revokedAt",
              created_at as "createdAt"`,
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


export async function setPhoneVerified(
  userId: string,
  verified: boolean,
  client?: Queryable
): Promise<void> {
  const runner = client ?? pool;
  await runAuthQuery(
    runner,
    `update users set phone_verified = $1 where id = $2`,
    [verified, userId]
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
    `update users set active = $1 where id = $2`,
    [active, userId]
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
    `update users set role = $1 where id = $2`,
    [role, userId]
  );
}
